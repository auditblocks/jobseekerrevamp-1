/** Map arbitrary Apify dataset item to naukri_jobs row fields (best-effort). */

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Title sometimes arrives as a number from Apify JSON. */
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

function pickNestedString(obj: Record<string, unknown>, path: string[]): string | null {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" && cur.trim() ? cur.trim() : null;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export interface MappedJob {
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

export function mapApifyItemToRow(item: unknown): MappedJob | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;

  const title =
    pickScalarString(o, [
      "Job Title",
      "title",
      "jobTitle",
      "positionTitle",
      "name",
      "job_title",
    ]) ??
    pickNestedString(o, ["job", "title"]);
  if (!title) return null;

  const apply_url =
    pickHttpUrl(o, [
      "Job URL",
      "apply_url",
      "applyUrl",
      "jobUrl",
      "url",
      "link",
      "applicationUrl",
      "naukriUrl",
    ]) ?? pickNestedString(o, ["job", "url"]);
  if (!apply_url || !/^https?:\/\//i.test(apply_url)) return null;

  const company_name =
    pickString(o, [
      "Company",
      "companyName",
      "company",
      "employer",
      "company_name",
    ]) ??
    pickNestedString(o, ["company", "name"]);

  const location =
    pickString(o, ["Location", "location", "locations", "place", "city"]) ??
    (Array.isArray(o.locations) && o.locations.length
      ? String(o.locations[0])
      : null);

  let posted_at: string | null = null;
  const pd = pickString(o, [
    "Posted Time",
    "postedAt",
    "postedDate",
    "createdAt",
    "scrapedAt",
    "date",
  ]);
  if (pd) {
    const t = Date.parse(pd);
    if (!Number.isNaN(t)) posted_at = new Date(t).toISOString();
  }

  const desc =
    pickString(o, [
      "Description",
      "Job Description",
      "job description",
      "Full Description",
      "Role Description",
      "description",
      "snippet",
      "summary",
      "jobDescription",
      "jobDescriptionText",
      "about",
      "job_details",
    ]) ??
    pickNestedString(o, ["job", "description"]) ??
    pickNestedString(o, ["listing", "description"]) ??
    "";
  const summary = desc ? truncate(desc, 12000) : null;

  const salary_text = pickString(o, ["Salary", "salary", "salaryText", "compensation"]);
  const experience_text = pickString(o, [
    "Experience Required",
    "experience",
    "experienceText",
    "exp",
  ]);

  const skillsRaw = o["Skills/Tags"] ?? o.skills ?? o.skill ?? o.tags ?? [];
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

export async function externalKeyFromUrl(applyUrl: string): Promise<string> {
  const enc = new TextEncoder().encode(applyUrl);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
