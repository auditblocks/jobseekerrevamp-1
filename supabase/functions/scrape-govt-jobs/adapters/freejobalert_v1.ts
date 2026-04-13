/**
 * @file FreeJobAlert v1 adapter — scrapes freejobalert.com government job listings.
 *
 * Exports two main functions:
 *  - `extractFreejobalertArticleLinks` — collects article detail URLs from the listing page.
 *  - `scrapeFreejobalertDetail` — parses a detail page into a `GovtJobPayload`.
 *
 * FreeJobAlert pages use an HTML table "overview" layout with header/value pairs
 * (Company Name, Start Date, Last Date, etc.) that are extracted via `extractOverviewCell`.
 * State codes are inferred from the organization/post name to support state-wise filtering.
 */
import type { GovtJobSourceConfig } from "../sources.ts";
import type { GovtJobPayload } from "./upsc_v1.ts";
import { extractDescriptionForGovtJob } from "../../_shared/govt-scrape/html.ts";
import { sanitizeAndWrapHtml } from "../../_shared/govt-scrape/html-extract.ts";

const DEFAULT_MODE_OF_APPLY = "Online";

/** Article links on FreeJobAlert government listing pages. */
export function extractFreejobalertArticleLinks(html: string, baseUrl: string): string[] {
  const found = new Set<string>();
  const absolute = /href="(https:\/\/www\.freejobalert\.com\/articles\/[^"]+)"/gi;
  for (const m of html.matchAll(absolute)) {
    found.add(toAbsoluteUrl(m[1], baseUrl));
  }
  const relative = /href="(\/articles\/[^"]+)"/gi;
  for (const m of html.matchAll(relative)) {
    found.add(toAbsoluteUrl(m[1], baseUrl));
  }
  return [...found];
}

/**
 * Parse a single FreeJobAlert article page into a `GovtJobPayload`.
 * Extracts structured fields from the overview table and derives metadata
 * (state code, slug, tags) for filtering and SEO.
 */
export function scrapeFreejobalertDetail(
  html: string,
  url: string,
  source: GovtJobSourceConfig,
): GovtJobPayload {
  // Prefer <h1> over <title> since <title> often has a "- FreeJobAlert" suffix
  const title = cleanupText(extractFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || "");
  const shortTitle = title.replace(/\s*-\s*FreeJobAlert.*$/i, "").trim();
  const h1 = cleanupText(extractFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || "");
  const postName = (h1 || shortTitle || "Government recruitment").slice(0, 300);

  const board = extractOverviewCell(html, /Company Name/i) || extractOverviewCell(html, /Recruitment Board/i) || null;

  const organization = board ? cleanupText(board).slice(0, 200) : source.organization;

  // Advt No cells sometimes contain only a dash/em-dash when not available — treat as null
  const advtNo =
    cleanupText(extractOverviewCell(html, /Advt No/i) || "").replace(/^[\u2013\-–—]\s*$/, "").trim() || null;

  const officialWebsiteRaw = extractOverviewCell(html, /Official Website/i);
  const officialWebsite = officialWebsiteRaw ? normalizeUrl(officialWebsiteRaw) : source.baseUrl;

  const applyUrl = extractApplyUrl(html) || officialWebsite || url;

  const startRaw = extractOverviewCell(html, /Start Date for Apply/i) || extractOverviewCell(html, /Opening Date/i);
  const endRaw = extractOverviewCell(html, /Last Date for Apply/i) || extractOverviewCell(html, /Closing Date/i);

  const application_start_date = parseDashedDateToIso(startRaw);
  const application_end_date = parseDashedDateToIso(endRaw);

  const feeCell = extractOverviewCell(html, /Application Fee/i);
  const application_fee = feeCell ? cleanupText(feeCell).slice(0, 500) : null;

  let description = extractDescriptionForGovtJob(html);
  if (!description) {
    console.warn(`[govt-scrape:${source.key}] content_missing: no main HTML for description`, { url });
    const pdf = extractFirst(html, /<a[^>]+href="([^"]+\.pdf)"[^>]*>/i);
    if (pdf) {
      const pdfUrl = toAbsoluteUrl(pdf, source.baseUrl);
      description = sanitizeAndWrapHtml(
        `<p class="govt-pdf-note">Recruitment details may include an official PDF. ` +
          `<a href="${pdfUrl.replace(/"/g, "&quot;")}" rel="noopener noreferrer" target="_blank">Download PDF</a></p>`,
      );
    }
  }

  // Build a unique slug using post name + org + year + article ID to prevent collisions
  const articleId = extractTrailingNumericId(url);
  const yearHint = extractYear(postName) || extractYear(title) || new Date().getFullYear();
  const stateCode = inferStateCode(organization, postName);
  const location = formatLocation(stateCode);

  const slug = slugify(
    `${postName}-${organization}-${source.key}-${yearHint}-${articleId || "job"}`,
  ).slice(0, 220);

  const summary = `${postName} — ${organization}.`;

  const job_posting_json: Record<string, unknown> = {
    listing_source: "freejobalert.com",
    detail_url: url,
    recruitment_board: organization,
  };

  return {
    organization,
    post_name: postName,
    slug,
    summary,
    exam_name: postName,
    advertisement_no: advtNo,
    official_website: officialWebsite,
    apply_url: applyUrl,
    location,
    application_start_date,
    application_end_date,
    application_fee,
    mode_of_apply: DEFAULT_MODE_OF_APPLY,
    description,
    visibility: "free",
    status: "active",
    meta_title: `${postName} ${yearHint}`.slice(0, 300),
    meta_description: `Apply for ${postName}. Last date: ${application_end_date ?? "Refer notification"}.`,
    job_posting_json,
    tags: dedupeTags([...source.tags, source.key, organization.replace(/\s+/g, "-").toLowerCase()]),
    source_key: source.key,
    state_code: stateCode,
  };
}

function dedupeTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const x = t.trim().toLowerCase();
    if (!x || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out.slice(0, 12);
}

function formatLocation(stateCode: string | null): string {
  if (!stateCode) return "India";
  if (stateCode === "IN") return "All India";
  return stateCode;
}

/**
 * Infer Indian state/UT code from the recruitment board or post name.
 * Matches state PSC abbreviations and full names; falls back to "IN" for
 * central bodies (SSC, UPSC, RRB, etc.). Returns null if unrecognised.
 */
function inferStateCode(board: string, post: string): string | null {
  const t = `${board} ${post}`.toUpperCase();

  const rules: Array<[RegExp, string]> = [
    [/(\b|\s)(APPSC|ANDHRA PRADESH)\b/, "AP"],
    [/(\b|\s)(TSPSC|TELANGANA)\b/, "TS"],
    [/(\b|\s)(TNPSC|TAMIL NADU)\b/, "TN"],
    [/(\b|\s)(KPSC|KARNATAKA PSC|\bKARNATAKA\b)/, "KA"],
    [/(\b|\s)(Kerala PSC|\bKERALA\b)/, "KL"],
    [/(\b|\s)(MPSC|MAHARASHTRA PSC|\bMAHARASHTRA\b)/, "MH"],
    [/(\b|\s)(GPSC|GUJARAT PSC|\bGUJARAT\b)/, "GJ"],
    [/(\b|\s)(Rajasthan PSC|\bRPSC\b|\bRAJASTHAN\b)/, "RJ"],
    [/(\b|\s)(MPPSC|\bMADHYA PRADESH\b)/, "MP"],
    [/(\b|\s)(UPPSC|\bUTTAR PRADESH\b|\bUP PCS\b)/, "UP"],
    [/(\b|\s)(BPSC|\bBIHAR\b)/, "BR"],
    [/(\b|\s)(WBPSC|\bWEST BENGAL\b)/, "WB"],
    [/(\b|\s)(OPSC|\bODISHA\b)/, "OD"],
    [/(\b|\s)(UKPSC|\bUTTARAKHAND\b)/, "UK"],
    [/(\b|\s)(HPPSC|\bHIMACHAL\b)/, "HP"],
    [/(\b|\s)(JKPSC|\bJAMMU\b|\bKASHMIR\b)/, "JK"],
    [/(\b|\s)(PPSC|\bPUNJAB\b)/, "PB"],
    [/(\b|\s)(HPSC|\bHARYANA\b)/, "HR"],
    [/(\b|\s)(GOA PSC|\bGOA\b)/, "GA"],
    [/(\b|\s)(NPSC|\bNAGALAND\b)/, "NL"],
    [/(\b|\s)(MIZORAM PSC|\bMIZORAM\b)/, "MZ"],
    [/(\b|\s)(Arunachal Pradesh PSC|ARUNACHAL)/, "AR"],
    [/(\b|\s)(Manipur PSC|\bMANIPUR\b)/, "MN"],
    [/(\b|\s)(Meghalaya PSC|\bMEGHALAYA\b)/, "ML"],
    [/(\b|\s)(Tripura PSC|\bTRIPURA\b)/, "TR"],
    [/(\b|\s)(Sikkim PSC|\bSIKKIM\b)/, "SK"],
    [/(\b|\s)(SSC|UPSC|RRB|IBPS|RBI|EPFO|ESIC|NABARD|NHAI|NHPC|IOCL|HPCL|COAL INDIA|CONCOR|BEL|NBCC|IRCON|IREDA|COAST GUARD|\bARMY\b|\bNAVY\b|\bIAF\b|\bINDIAN RAILWAY|RAILWAY RECRUITMENT)/, "IN"],
  ];

  for (const [re, code] of rules) {
    if (re.test(t)) return code;
  }
  return null;
}

function extractTrailingNumericId(url: string): string | null {
  const m = url.match(/-(\d{6,})(?:\/)?$/);
  return m ? m[1] : null;
}

/**
 * Best-effort extraction of the "Apply Online" link from the page.
 * Priority: explicit "Apply Online" anchor → RRB apply domain → any govt/apply-like URL.
 */
function extractApplyUrl(html: string): string | null {
  const applyHere = /<a[^>]+href="([^"]+)"[^>]*>\s*Apply Online\s*<\/a>/i.exec(html);
  if (applyHere?.[1]) return normalizeUrl(applyHere[1]);

  const rrb = /https?:\/\/(?:www\.)?rrbapply\.gov\.in[^\s"'<>]*/i.exec(html);
  if (rrb?.[0]) return rrb[0];

  const anyHttps = [...html.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
    .map((m) => m[0])
    .find((u) => /apply|recruitment|register|onlineform|nic\.in|gov\.in/i.test(u));
  return anyHttps ? normalizeUrl(anyHttps) : null;
}

/** Extract the value cell adjacent to a header cell in FreeJobAlert's overview table rows. */
function extractOverviewCell(html: string, header: RegExp): string | null {
  const pattern = new RegExp(
    `<tr[^>]*>\\s*<t[dh][^>]*>\\s*${header.source}[^<]*</t[dh]>\\s*<t[dh][^>]*>([\\s\\S]*?)</t[dh]>`,
    "i",
  );
  const m = html.match(pattern);
  return m ? stripTags(m[1]) : null;
}

/** Convert dd-mm-yyyy / dd.mm.yyyy / dd/mm/yyyy to ISO yyyy-mm-dd. */
function parseDashedDateToIso(raw: string | null): string | null {
  if (!raw) return null;
  const text = cleanupText(raw);
  const m = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeUrl(raw: string): string {
  const cleaned = cleanupText(stripTags(raw));
  const m = cleaned.match(/https?:\/\/[^\s]+/i);
  return (m ? m[0] : cleaned).replace(/[),.;]+$/, "");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function extractFirst(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  return m?.[1] ?? m?.[0] ?? null;
}

function cleanupText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function extractYear(value: string): number | null {
  const m = value.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function toAbsoluteUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http")) return href;
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}${href.startsWith("/") ? href : `/${href}`}`;
}
