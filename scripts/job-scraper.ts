import { config as loadEnv } from "dotenv";
import { chromium, type Browser, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { generateJobSlug } from "./utils/slug";
import { extractDateNearKeyword, parseGovDateToIso } from "./utils/date";
import { sanitizeAndWrapHtml } from "./utils/html";
import { generateAISummary } from "./utils/summary";

loadEnv({ path: ".env.local" });
loadEnv();

const UPSC_ACTIVE_EXAMS_URL = "https://upsc.gov.in/examinations/active-exams";
const DEFAULT_ORGANIZATION = "UPSC";
const DEFAULT_SOURCE_KEY = "upsc";
const DEFAULT_STATE_CODE = "IN";
const DEFAULT_LOCATION = "All India";
const DEFAULT_VISIBILITY = "free";
const DEFAULT_STATUS = "active";
const DEFAULT_MODE_OF_APPLY = "Online";

type Nullable<T> = T | null;

interface GovtJobPayload {
  organization: string;
  post_name: string;
  slug: string;
  summary: string;
  exam_name: Nullable<string>;
  advertisement_no: Nullable<string>;
  official_website: Nullable<string>;
  apply_url: Nullable<string>;
  location: string;
  application_start_date: Nullable<string>;
  application_end_date: Nullable<string>;
  application_fee: Nullable<string>;
  mode_of_apply: string;
  description: Nullable<string>;
  visibility: "free" | "premium";
  status: "active" | "expired";
  meta_title: string;
  meta_description: string;
  job_posting_json: Nullable<Record<string, unknown>>;
  tags: string[];
  source_key: string;
  state_code: Nullable<string>;
}

interface ScrapeResult {
  payload: GovtJobPayload;
  sourceUrl: string;
}

interface Counters {
  discovered: number;
  inserted: number;
  updated: number;
  skipped: number;
  exam_generated: number;
  exam_skipped: number;
  failed: number;
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
const FORCE_REGENERATE = args.includes("--force-regenerate");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 1;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultMasterExamId = process.env.DEFAULT_UPSC_MASTER_EXAM_ID || null;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing required env values. Ensure SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are configured.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run(): Promise<void> {
  const counters: Counters = {
    discovered: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    exam_generated: 0,
    exam_skipped: 0,
    failed: 0,
  };

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const links = await fetchActiveExamLinks(page);
    const targetLinks = links.slice(0, LIMIT);
    counters.discovered = targetLinks.length;

    for (const link of targetLinks) {
      try {
        const scraped = await scrapeExamDetail(browser, link);
        const upsertResult = await upsertGovtJob(scraped.payload);

        if (upsertResult === "inserted") counters.inserted += 1;
        if (upsertResult === "updated") counters.updated += 1;
        if (upsertResult === "skipped") counters.skipped += 1;

        if (upsertResult === "inserted" || FORCE_REGENERATE) {
          const jobId = await getJobIdBySlug(scraped.payload.slug);
          if (!jobId) {
            counters.failed += 1;
            log("error", "Could not find job row after upsert", { slug: scraped.payload.slug });
            continue;
          }

          const shouldGenerate = FORCE_REGENERATE
            ? true
            : !(await hasExistingQuestions(jobId));

          if (!shouldGenerate) {
            counters.exam_skipped += 1;
            log("info", "Skipping question generation; questions already exist", { jobId });
            continue;
          }

          const masterExamId = await resolveMasterExamId(scraped.payload.exam_name);
          if (!masterExamId) {
            counters.exam_skipped += 1;
            log("warn", "No master exam mapping found; skipping question generation", {
              jobId,
              exam_name: scraped.payload.exam_name,
            });
            continue;
          }

          if (DRY_RUN) {
            counters.exam_skipped += 1;
            log("info", "Dry run: skipping generate-exam-questions invoke", { jobId, masterExamId });
          } else {
            await invokeGenerateExamQuestions(jobId, masterExamId, scraped.payload);
            counters.exam_generated += 1;
          }
        }
      } catch (error) {
        counters.failed += 1;
        log("error", "Failed processing exam link", { link, error: getErrorMessage(error) });
      }
    }
  } finally {
    await browser.close();
  }

  log("info", "Scrape run completed", counters);
}

async function fetchActiveExamLinks(page: Page): Promise<string[]> {
  await withRetry(() => page.goto(UPSC_ACTIVE_EXAMS_URL, { waitUntil: "domcontentloaded", timeout: 45_000 }));
  await page.waitForTimeout(1000);

  const links = await page.$$eval("a", (anchors) =>
    anchors
      .map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: (a.textContent || "").trim(),
      }))
      .filter(
        (a) =>
          a.href &&
          a.href.includes("/examinations/") &&
          !a.href.endsWith("/active-exams") &&
          !a.href.endsWith("/exam-calendar") &&
          !a.href.endsWith("/forthcoming-exams") &&
          !a.href.endsWith("/previous-question-papers") &&
          /\b(20\d{2})\b/.test(a.text),
      )
      .map((a) => a.href),
  );

  const unique = Array.from(new Set(links)).filter((href) => href.startsWith("http"));
  if (!unique.length) {
    throw new Error("No exam links found on UPSC Active Examinations page.");
  }

  return unique;
}

async function scrapeExamDetail(browser: Browser, url: string): Promise<ScrapeResult> {
  const page = await browser.newPage();
  try {
    await withRetry(() => page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 }));
    await page.waitForTimeout(800);

    const captionName = await extractExamNameFromCaption(page);
    const headingName = await firstText(page, ["h1.page-header", "h1", ".page-title", ".job-title", "title"]);
    const resolvedTitle = captionName || headingName || "UPSC Notification";
    const postName = normalizeExamTitle(resolvedTitle);
    const examName = normalizeExamTitle(captionName || (await firstText(page, ["h2", ".exam-name", ".subtitle"])) || postName);
    const fullText = await page.locator("body").innerText();
    const contentHtml = await firstHtml(page, [
      ".region-content",
      ".view-content",
      ".notification-content",
      ".field-item",
      "main",
      "article",
      "body",
    ]);

    const applicationStartDate =
      extractDateNearKeyword(fullText, /start|opening|from|application starts|date of notification/) || null;
    const applicationEndDate =
      extractDateNearKeyword(fullText, /end|last date|closing|apply till/) || null;
    const advertisementNo = extractAdvertisementNo(fullText);
    const applyUrl = await findApplyUrl(page, url);
    const officialWebsite = "https://upsc.gov.in";
    const fee = extractApplicationFee(fullText);
    const parsedYear = extractYear(postName) || extractYear(examName || "") || new Date().getFullYear();
    const slug = generateJobSlug({
      postName,
      organization: DEFAULT_ORGANIZATION,
      yearHint: parsedYear,
      examName,
    });

    const fallbackSummary = `${postName} recruitment update from ${DEFAULT_ORGANIZATION}.`;
    const summary = await generateAISummary(fullText, fallbackSummary);

    const payload: GovtJobPayload = {
      organization: DEFAULT_ORGANIZATION,
      post_name: postName,
      slug,
      summary,
      exam_name: examName,
      advertisement_no: advertisementNo,
      official_website: officialWebsite,
      apply_url: applyUrl,
      location: DEFAULT_LOCATION,
      application_start_date: parseGovDateToIso(applicationStartDate),
      application_end_date: parseGovDateToIso(applicationEndDate),
      application_fee: fee,
      mode_of_apply: DEFAULT_MODE_OF_APPLY,
      description: sanitizeAndWrapHtml(contentHtml),
      visibility: DEFAULT_VISIBILITY,
      status: DEFAULT_STATUS,
      meta_title: `${postName} Notification ${parsedYear}`,
      meta_description: `Apply for ${postName}. Last date: ${applicationEndDate || "Refer notification"}.`,
      job_posting_json: null,
      tags: ["upsc", "government-job", "central"],
      source_key: DEFAULT_SOURCE_KEY,
      state_code: DEFAULT_STATE_CODE,
    };

    return { payload, sourceUrl: url };
  } finally {
    await page.close();
  }
}

async function upsertGovtJob(payload: GovtJobPayload): Promise<"inserted" | "updated" | "skipped"> {
  const { data: existing, error: lookupError } = await supabase
    .from("govt_jobs")
    .select("id, updated_at")
    .eq("slug", payload.slug)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (DRY_RUN) {
    log("info", "Dry run payload", payload);
    return "skipped";
  }

  const { error: upsertError } = await supabase.from("govt_jobs").upsert(payload, {
    onConflict: "slug",
  });

  if (upsertError) throw upsertError;
  return existing ? "updated" : "inserted";
}

async function getJobIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabase.from("govt_jobs").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function hasExistingQuestions(jobId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  if (error) throw error;
  return (count || 0) > 0;
}

async function resolveMasterExamId(examName: string | null): Promise<string | null> {
  if (examName) {
    const { data: exactMatch } = await supabase
      .from("master_exams")
      .select("id")
      .ilike("name", `%${examName}%`)
      .eq("is_active", true)
      .maybeSingle();

    if (exactMatch?.id) return exactMatch.id;
  }

  const { data: upscCategory } = await supabase
    .from("master_exams")
    .select("id")
    .eq("category", "UPSC")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (upscCategory?.id) return upscCategory.id;
  return defaultMasterExamId;
}

async function invokeGenerateExamQuestions(
  jobId: string,
  masterExamId: string,
  payload: GovtJobPayload,
): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-exam-questions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      apikey: serviceRoleKey!,
    },
    body: JSON.stringify({
      jobId,
      masterExamId,
      examName: payload.exam_name || payload.post_name,
      postName: payload.post_name,
      organization: payload.organization,
      count: 30,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`generate-exam-questions failed: ${response.status} ${errorText}`);
  }
}

async function firstText(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    const text = (await locator.textContent())?.trim();
    if (text) return text;
  }
  return null;
}

async function firstHtml(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    const html = await locator.innerHTML();
    if (html?.trim()) return html;
  }
  return null;
}

async function findApplyUrl(page: Page, fallbackUrl: string): Promise<string | null> {
  const candidate = await page.$$eval("a", (anchors) => {
    const applyAnchor = anchors.find((a) => /apply|registration|online form/i.test(a.textContent || ""));
    return (applyAnchor as HTMLAnchorElement | undefined)?.href || null;
  });

  return candidate || fallbackUrl || null;
}

function inferExamName(postName: string): string | null {
  const match = postName.match(/\b([A-Za-z ]+)\s(\d{4})\b/);
  return match ? match[0] : null;
}

async function extractExamNameFromCaption(page: Page): Promise<string | null> {
  const captionText = await firstText(page, ["table caption", ".views-table caption"]);
  if (!captionText) return null;
  const match = captionText.match(/name of examination\s*:\s*(.+)$/i);
  return match ? match[1].trim() : captionText.trim();
}

function normalizeExamTitle(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^name of examination\s*:\s*/i, "")
    .trim();
}

function extractAdvertisementNo(text: string): string | null {
  const match = text.match(/(adv(?:ertisement)?\s*(?:no|number)?\s*[:.-]?\s*[A-Za-z0-9/-]+)/i);
  return match ? match[1].trim() : null;
}

function extractApplicationFee(text: string): string | null {
  const feeLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        /fee|application fee|examination fee/i.test(line) &&
        !/^feedback$/i.test(line) &&
        line.length > 8,
    );

  return feeLine || null;
}

function extractYear(input: string): number | null {
  const year = input.match(/\b(20\d{2})\b/);
  return year ? Number(year[1]) : null;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}

function log(level: "info" | "warn" | "error", message: string, data?: unknown): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    data: data || null,
  });
  console.log(line);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

run().catch((error) => {
  log("error", "Fatal scraper failure", { error: getErrorMessage(error) });
  process.exit(1);
});
