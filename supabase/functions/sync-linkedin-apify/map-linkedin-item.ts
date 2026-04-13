/**
 * @module map-linkedin-item
 * @description Best-effort mapper that normalises Apify LinkedIn scraper dataset
 * items (primarily curious_coder~linkedin-jobs-scraper) into the `naukri_jobs`
 * row shape. Handles HTML descriptions by stripping tags, combines salary info
 * arrays, and derives experience text from seniority + employment type fields.
 * Items without a valid title + HTTP URL are rejected (return null).
 */

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/** Strips script/style blocks first, then all remaining HTML tags. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickScalarString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function pickHttpUrl(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v !== "string") continue;
    const u = v.trim();
    if (/^https?:\/\//i.test(u)) return u;
  }
  return null;
}

/** Coerces skills into an array – handles arrays, comma/pipe-delimited strings, and objects. */
function normalizeSkills(raw: unknown): unknown {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    return raw
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === "object") return raw;
  return [];
}

export interface MappedLinkedInJob {
  title: string;
  company_name: string | null;
  location: string | null;
  apply_url: string;
  posted_at: string | null;
  summary: string | null;
  salary_text: string | null;
  experience_text: string | null;
  skills: unknown;
  raw_item: Record<string, unknown>;
}

/**
 * Maps a single raw Apify dataset item to a `MappedLinkedInJob`. Returns null
 * when mandatory fields (title, valid HTTP job URL) are missing.
 */
export function mapLinkedInItemToRow(item: unknown): MappedLinkedInJob | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;

  const title =
    pickScalarString(o, ["title", "jobTitle", "name"]) ?? pickString(o, ["title"]);
  if (!title) return null;

  const apply_url =
    pickHttpUrl(o, ["link", "jobUrl", "job_link", "applyUrl", "apply_url", "url"]) ??
    null;
  if (!apply_url || !/^https?:\/\//i.test(apply_url)) return null;

  const company_name = pickString(o, ["companyName", "company", "company_name"]);

  const location = pickString(o, ["location", "formattedLocation", "jobLocation"]);

  let posted_at: string | null = null;
  const pd = pickString(o, ["postedAt", "postedDate", "datePosted", "createdAt"]);
  if (pd) {
    const t = Date.parse(pd);
    if (!Number.isNaN(t)) posted_at = new Date(t).toISOString();
  }

  // Prefer plain text description; fall back to stripping HTML if only HTML is available
  let summary: string | null = null;
  const descText = pickString(o, ["descriptionText", "description", "snippet"]);
  if (descText) {
    summary = truncate(descText, 12000);
  } else {
    const html = pickString(o, ["descriptionHtml", "description_html"]);
    if (html) {
      const plain = stripHtml(html);
      if (plain) summary = truncate(plain, 12000);
    }
  }

  // LinkedIn sometimes provides salary as an array of parts (e.g. ["$100K", "per year"])
  let salary_text: string | null = null;
  const si = o.salaryInfo;
  if (Array.isArray(si) && si.length) {
    const parts = si.map((x) => String(x).trim()).filter(Boolean);
    if (parts.length) salary_text = parts.join(" · ");
  }
  if (!salary_text) {
    salary_text = pickString(o, ["salary", "salaryText"]);
  }

  // Combine seniority level + employment type as a single experience descriptor
  const seniority = pickString(o, ["seniorityLevel", "seniority"]);
  const employment = pickString(o, ["employmentType", "employment"]);
  const experience_text = [seniority, employment].filter(Boolean).join(" · ") || null;

  const skillsRaw =
    o.skills ??
    o.skill ??
    o.tags ??
    o.industries ??
    o.jobFunction ??
    [];
  const skills = normalizeSkills(skillsRaw);

  return {
    title,
    company_name,
    location,
    apply_url,
    posted_at,
    summary,
    salary_text,
    experience_text,
    skills,
    raw_item: o,
  };
}

/** Generates a deterministic SHA-256 hex digest of the URL, used as upsert key in naukri_jobs. */
export async function externalKeyFromUrl(applyUrl: string): Promise<string> {
  const enc = new TextEncoder().encode(applyUrl);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
