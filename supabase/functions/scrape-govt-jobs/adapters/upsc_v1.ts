/**
 * @file UPSC v1 adapter — scrapes the upsc.gov.in Active Examinations page.
 *
 * Exports two main functions:
 *  - `extractActiveExamLinks` — pulls individual exam detail URLs from the listing page.
 *  - `scrapeUpscDetail` — parses a single exam detail page into a `GovtJobPayload`.
 *
 * Also exports the shared `GovtJobPayload` type used by all source adapters.
 */
import type { GovtJobSourceConfig } from "../sources.ts";
import { extractDescriptionForGovtJob } from "../../_shared/govt-scrape/html.ts";
import { sanitizeAndWrapHtml } from "../../_shared/govt-scrape/html-extract.ts";

export interface GovtJobPayload {
  organization: string;
  post_name: string;
  slug: string;
  summary: string;
  exam_name: string | null;
  advertisement_no: string | null;
  official_website: string | null;
  apply_url: string | null;
  location: string;
  application_start_date: string | null;
  application_end_date: string | null;
  application_fee: string | null;
  mode_of_apply: string;
  description: string | null;
  visibility: "free" | "premium";
  status: "active" | "expired";
  meta_title: string;
  meta_description: string;
  job_posting_json: Record<string, unknown> | null;
  tags: string[];
  source_key: string;
  state_code: string | null;
}

const DEFAULT_MODE_OF_APPLY = "Online";
const DEFAULT_STATUS = "active" as const;
const DEFAULT_VISIBILITY = "free" as const;

/**
 * Extract individual exam detail links from the UPSC active-exams listing HTML.
 * Filters out navigation links (e.g. "Active Exams", "Calendar") and keeps only
 * anchors whose visible text contains a 4-digit year — a reliable heuristic for
 * actual exam notices on upsc.gov.in.
 */
export function extractActiveExamLinks(html: string, baseUrl: string): string[] {
  const matches = [...html.matchAll(/<a[^>]*href="([^"]*\/examinations\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const links = matches
    .map((m) => ({ href: toAbsoluteUrl(m[1], baseUrl), text: cleanupText(m[2]) }))
    .filter((m) => /\b20\d{2}\b/.test(m.text) && !/active exams|forthcoming|calendar/i.test(m.text))
    .map((m) => m.href);

  return [...new Set(links)];
}

/**
 * Parse a single UPSC exam detail page into a structured `GovtJobPayload`.
 * The exam name is derived from the `<caption>` element (preferred) or the page `<h1>`.
 * Dates use the dd/mm/yyyy format common on UPSC pages.
 */
export function scrapeUpscDetail(
  html: string,
  url: string,
  source: GovtJobSourceConfig,
): GovtJobPayload {
  // UPSC detail pages use a <caption> inside a summary table for the exam name
  const caption = extractFirst(html, /<caption[^>]*>\s*Name of Examination:\s*([^<]+)<\/caption>/i);
  const pageHeader = extractFirst(html, /<h1[^>]*class="[^"]*page-header[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const postName = cleanupText(caption || pageHeader || "UPSC Examination");
  const examName = postName;
  const year = extractYear(postName) || new Date().getFullYear();

  const dateOfNotification = parseGovDateToIso(extractFirst(html, /Date of Notification[\s\S]*?>(\d{1,2}\/\d{1,2}\/\d{4})</i));
  const lastDate = parseGovDateToIso(
    extractFirst(html, /Last Date[^<]*<\/strong>[\s\S]*?>(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
      extractFirst(html, /Last Date[^<]*?(\d{1,2}\/\d{1,2}\/\d{4})/i),
  );
  const noticePdf = extractFirst(html, /<a[^>]*href="([^"]+\.pdf)"[^>]*>/i);

  // Fall back to a PDF download link when no parseable HTML description exists
  let description = extractDescriptionForGovtJob(html);
  if (!description) {
    console.warn(`[govt-scrape:${source.key}] content_missing: no main HTML for description`, { url });
    if (noticePdf) {
      const pdfUrl = toAbsoluteUrl(noticePdf, source.baseUrl);
      description = sanitizeAndWrapHtml(
        `<p class="govt-pdf-note">Full notification text may be available in the official PDF. ` +
          `<a href="${pdfUrl.replace(/"/g, "&quot;")}" rel="noopener noreferrer" target="_blank">Download notification (PDF)</a></p>`,
      );
    }
  }

  const slug = buildLegacyUpscSlug(postName, year);
  const summary = `${postName} recruitment update from UPSC.`;

  const examLineTags = inferUpscExamLineTags(postName);

  const jobPosting: Record<string, unknown> = {};
  if (noticePdf) jobPosting.notice_pdf = toAbsoluteUrl(noticePdf, source.baseUrl);

  return {
    organization: source.organization,
    post_name: postName,
    slug,
    summary,
    exam_name: examName,
    advertisement_no: extractAdvertisementNo(postName),
    official_website: source.baseUrl,
    apply_url: url,
    location: source.location,
    application_start_date: dateOfNotification,
    application_end_date: lastDate,
    application_fee: null,
    mode_of_apply: DEFAULT_MODE_OF_APPLY,
    description,
    visibility: DEFAULT_VISIBILITY,
    status: DEFAULT_STATUS,
    meta_title: `${postName} Notification ${year}`,
    meta_description: `Apply for ${postName}. Last date: ${lastDate ?? "Refer notification"}.`,
    job_posting_json: Object.keys(jobPosting).length ? jobPosting : null,
    tags: dedupeTagList([...examLineTags, ...source.tags]),
    source_key: source.key,
    state_code: source.stateCode,
  };
}

/** Derive granular exam-line tags (e.g. "civil-services", "nda") from the post name for search/filtering. */
function inferUpscExamLineTags(postName: string): string[] {
  const p = postName;
  const out: string[] = [];
  if (/Indian Forest Service|\bIFS\b/i.test(p)) out.push("indian-forest-service");
  if (/Central Armed Police|\bCAPF\b/i.test(p)) out.push("capf");
  if (/Civil Services|\(Preliminary\).*Examination|CS\(P\)/i.test(p)) out.push("civil-services");
  if (/Engineering Services|\bESE\b/i.test(p)) out.push("engineering-services");
  if (/Combined Geo-Scientist/i.test(p)) out.push("combined-geo-scientist");
  if (/Combined Medical Services/i.test(p)) out.push("combined-medical-services");
  if (/\bNDA\b|National Defence Academy/i.test(p)) out.push("nda");
  if (/\bCDS\b|Combined Defence Services/i.test(p)) out.push("cds");
  if (/SO\/Steno|Section Officers/i.test(p)) out.push("so-steno");
  return out;
}

function dedupeTagList(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.slice(0, 16);
}

/** Preserves existing production slugs for UPSC (postName-UPSC-year style). */
function buildLegacyUpscSlug(postName: string, year: number): string {
  return slugify(`${postName}-UPSC-${year}`);
}

/** Convert dd/mm/yyyy (Indian govt standard) to ISO yyyy-mm-dd. */
function parseGovDateToIso(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function extractFirst(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  return m?.[1] || m?.[0] || null;
}

function cleanupText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http")) return href;
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}${href.startsWith("/") ? href : `/${href}`}`;
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

function extractAdvertisementNo(value: string): string | null {
  const m = value.match(/\b(\d{1,2}\/20\d{2}(?:-[A-Z]+)?)\b/);
  return m ? m[1] : null;
}
