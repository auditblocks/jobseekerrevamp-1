/**
 * @file scrape-govt-jobs — Supabase Edge Function
 *
 * Admin-only endpoint that orchestrates government job scraping from multiple
 * configurable sources (UPSC, FreeJobAlert, SSC, etc.). For each source it:
 *   1. Fetches the listing page and extracts individual job links via a source adapter.
 *   2. Scrapes detail pages and upserts structured `govt_jobs` rows.
 *   3. Optionally triggers AI-based exam question generation for newly scraped jobs.
 *
 * Accepts `source`, `limit`, `forceRegenerate`, and `generateExams` in the
 * JSON body. Returns per-source counters and a processed-jobs manifest.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { extractActiveExamLinks, scrapeUpscDetail, type GovtJobPayload } from "./adapters/upsc_v1.ts";
import { extractFreejobalertArticleLinks, scrapeFreejobalertDetail } from "./adapters/freejobalert_v1.ts";
import {
  formatRegisteredSourceKeys,
  getSourceByKey,
  listEnabledSources,
  listSourceKeysForAdmin,
  type GovtJobSourceConfig,
} from "./sources.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Max detail pages per source per invocation (prevents Edge timeouts). */
const MAX_JOBS_PER_SOURCE = 300;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Unauthorized: No authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ success: false, error: "Unauthorized: Invalid token" }, 401);
    }

    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);

    const hasAdminRole = !!roleData;
    const hasSuperadminProfile = profileData?.role === "superadmin";
    if (!hasAdminRole && !hasSuperadminProfile) {
      return json({ success: false, error: "Forbidden: Admin access required" }, 403);
    }

    const body = await safeJson(req);
    const listingLimit = parseListingLimit(body?.limit);
    const forceRegenerate = body?.forceRegenerate === true;
    const sourceParam = typeof body?.source === "string" ? body.source.trim().toLowerCase() : "";
    const generateExamsExplicit = body?.generateExams;
    // Exam generation is gated: auto-enabled only for small batches (<=10) to
    // avoid runaway AI costs; explicitly opt-in allows up to 25 per invocation.
    const allowExamGeneration =
      (generateExamsExplicit === true &&
        listingLimit !== null &&
        listingLimit > 0 &&
        listingLimit <= 25) ||
      (generateExamsExplicit !== false &&
        listingLimit !== null &&
        listingLimit > 0 &&
        listingLimit <= 10);

    let sourcesToRun: GovtJobSourceConfig[];
    try {
      sourcesToRun = resolveSourcesToRun(sourceParam);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json(
        {
          success: false,
          error: msg,
          data: { available_sources: listSourceKeysForAdmin() },
        },
        400,
      );
    }

    if (!sourcesToRun.length) {
      return json(
        {
          success: false,
          error: "No sources to run. Pass source: 'all' or a source key, or enable sources in configuration.",
          data: { available_sources: listSourceKeysForAdmin() },
        },
        400,
      );
    }

    const globalCounters = {
      discovered: 0,
      inserted: 0,
      updated: 0,
      exam_generated: 0,
      exam_skipped: 0,
      failed: 0,
    };

    const bySource: Record<string, typeof globalCounters> = {};
    const processed: Array<{ slug: string; status: string; source_key?: string; reason?: string }> = [];

    for (const source of sourcesToRun) {
      bySource[source.key] = {
        discovered: 0,
        inserted: 0,
        updated: 0,
        exam_generated: 0,
        exam_skipped: 0,
        failed: 0,
      };

      try {
        await delay(source.requestDelayMs);
        const listingHtml = await fetchHtml(source.listingUrl);
        const allLinks = await extractLinksForSource(source, listingHtml);
        const cap = listingLimit === null ? MAX_JOBS_PER_SOURCE : listingLimit;
        const examLinks = allLinks.slice(0, cap);

        bySource[source.key].discovered = examLinks.length;
        globalCounters.discovered += examLinks.length;

        if (!examLinks.length) {
          processed.push({ slug: "-", status: "skipped", source_key: source.key, reason: "no_links" });
          continue;
        }

        for (const link of examLinks) {
          try {
            // Throttle requests to avoid being rate-limited by the source site
            await delay(source.requestDelayMs);
            const detailHtml = await fetchHtml(link);
            const payload = await scrapeDetailForSource(source, detailHtml, link);

            // Check if this job already exists (by slug) to distinguish insert vs update
            const { data: existing, error: existingError } = await supabase
              .from("govt_jobs")
              .select("id")
              .eq("slug", payload.slug)
              .maybeSingle();
            if (existingError) throw existingError;

            const { error: upsertError } = await supabase.from("govt_jobs").upsert(payload, { onConflict: "slug" });
            if (upsertError) throw upsertError;

            if (existing?.id) {
              countersBump(globalCounters, bySource, source.key, "updated");
            } else {
              countersBump(globalCounters, bySource, source.key, "inserted");
            }

            // Re-fetch the job row to get its DB-assigned id for exam question generation
            const { data: jobData, error: jobError } = await supabase
              .from("govt_jobs")
              .select("id")
              .eq("slug", payload.slug)
              .maybeSingle();
            if (jobError || !jobData?.id) throw jobError ?? new Error("Unable to retrieve inserted job");

            // Skip exam generation if questions already exist (unless force-regenerate)
            const { count: questionCount, error: countError } = await supabase
              .from("exam_questions")
              .select("id", { count: "exact", head: true })
              .eq("job_id", jobData.id);
            if (countError) throw countError;

            const shouldGenerate =
              allowExamGeneration && (forceRegenerate || !questionCount || questionCount === 0);
            if (!shouldGenerate) {
              countersBump(globalCounters, bySource, source.key, "exam_skipped");
              processed.push({
                slug: payload.slug,
                status: existing?.id ? "updated" : "inserted",
                source_key: source.key,
                reason: allowExamGeneration ? "questions_exist" : "exam_generation_skipped_bulk",
              });
              continue;
            }

            // Resolve which master_exam template to use for AI question generation
            const masterExamId = await resolveMasterExamId(
              supabase,
              payload.exam_name,
              source.masterExamCategoryFallback,
            );
            if (!masterExamId) {
              countersBump(globalCounters, bySource, source.key, "exam_skipped");
              processed.push({
                slug: payload.slug,
                status: existing?.id ? "updated" : "inserted",
                source_key: source.key,
                reason: "master_exam_not_found",
              });
              continue;
            }

            // Delegate to the generate-exam-questions Edge Function using service role auth
            const fnResp = await fetch(`${supabaseUrl}/functions/v1/generate-exam-questions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                apikey: supabaseServiceKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jobId: jobData.id,
                masterExamId,
                examName: payload.exam_name || payload.post_name,
                postName: payload.post_name,
                organization: payload.organization,
                count: 30,
              }),
            });

            if (!fnResp.ok) {
              const errorText = await fnResp.text();
              throw new Error(`generate-exam-questions failed: ${fnResp.status} ${errorText}`);
            }

            countersBump(globalCounters, bySource, source.key, "exam_generated");
            processed.push({
              slug: payload.slug,
              status: existing?.id ? "updated" : "inserted",
              source_key: source.key,
            });
          } catch (error) {
            console.error(`Failed job scrape item [${source.key}]:`, error);
            countersBump(globalCounters, bySource, source.key, "failed");
          }
        }
      } catch (error) {
        console.error(`Source run failed [${source.key}]:`, error);
        countersBump(globalCounters, bySource, source.key, "failed");
      }
    }

    return json({
      success: true,
      message: `Processed government job sources: ${sourcesToRun.map((s) => s.key).join(", ")}`,
      data: {
        counters: globalCounters,
        by_source: bySource,
        processed,
        sources_run: sourcesToRun.map((s) => ({ key: s.key, displayName: s.displayName })),
        available_sources: listSourceKeysForAdmin(),
        limits: {
          listing_per_source: listingLimit,
          exam_generation: allowExamGeneration,
        },
      },
    });
  } catch (error: unknown) {
    console.error("scrape-govt-jobs error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ success: false, error: message }, 500);
  }
});

/** Resolve which source configs to scrape based on the caller's `source` param ("all" or a specific key). */
function resolveSourcesToRun(sourceParam: string): GovtJobSourceConfig[] {
  if (!sourceParam || sourceParam === "all") {
    return listEnabledSources();
  }

  const cfg = getSourceByKey(sourceParam);
  if (!cfg) {
    throw new Error(`Unknown source "${sourceParam}". Use "all" or one of: ${formatRegisteredSourceKeys()}`);
  }
  if (!cfg.enabled) {
    throw new Error(`Source "${cfg.key}" is not enabled yet. See sources.ts and enable when the adapter is ready.`);
  }
  return [cfg];
}

/** Increment a counter in both the global summary and the per-source breakdown. */
function countersBump(
  global: {
    inserted: number;
    updated: number;
    exam_generated: number;
    exam_skipped: number;
    failed: number;
  },
  bySource: Record<string, typeof global>,
  sourceKey: string,
  field: "inserted" | "updated" | "exam_generated" | "exam_skipped" | "failed",
): void {
  global[field] += 1;
  if (bySource[sourceKey]) bySource[sourceKey][field] += 1;
}

/** Dispatch to the correct adapter's link-extraction logic based on `source.adapter`. */
async function extractLinksForSource(source: GovtJobSourceConfig, listingHtml: string): Promise<string[]> {
  switch (source.adapter) {
    case "upsc_v1":
      return extractActiveExamLinks(listingHtml, source.baseUrl);
    case "ssc_notices_v1":
      throw new Error("SSC adapter is registered but not implemented. Keep source disabled in sources.ts.");
    case "freejobalert_v1":
      return extractFreejobalertArticleLinks(listingHtml, source.baseUrl);
    default:
      throw new Error(`Unhandled adapter: ${source.adapter}`);
  }
}

/** Dispatch to the correct adapter's detail-scraping logic. */
async function scrapeDetailForSource(
  source: GovtJobSourceConfig,
  html: string,
  url: string,
): Promise<GovtJobPayload> {
  switch (source.adapter) {
    case "upsc_v1":
      return scrapeUpscDetail(html, url, source);
    case "ssc_notices_v1":
      throw new Error("SSC adapter not implemented");
    case "freejobalert_v1":
      return scrapeFreejobalertDetail(html, url, source);
    default:
      throw new Error(`Unhandled adapter: ${source.adapter}`);
  }
}

/**
 * Normalise the caller-provided `limit` into a concrete number or `null` (unlimited).
 * Defaults to 120 if omitted; clamps within [1, MAX_JOBS_PER_SOURCE].
 */
function parseListingLimit(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 120;
  if (typeof raw === "string") {
    const t = raw.trim().toLowerCase();
    if (t === "all" || t === "unlimited") return null;
  }
  if (raw === "all") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 120;
  if (n <= 0) return null;
  return Math.max(1, Math.min(Math.floor(n), MAX_JOBS_PER_SOURCE));
}

/**
 * Resolve the `master_exams` row id to associate with a scraped job.
 * Strategy: exact name match → category fallback → env-var default.
 */
async function resolveMasterExamId(
  supabase: ReturnType<typeof createClient>,
  examName: string | null,
  categoryFallback: string,
): Promise<string | null> {
  if (examName) {
    const { data } = await supabase
      .from("master_exams")
      .select("id")
      .ilike("name", `%${examName}%`)
      .eq("is_active", true)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const { data: catExam } = await supabase
    .from("master_exams")
    .select("id")
    .eq("category", categoryFallback)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (catExam?.id) return catExam.id;

  if (categoryFallback === "UPSC") {
    return Deno.env.get("DEFAULT_UPSC_MASTER_EXAM_ID") || null;
  }
  return Deno.env.get("DEFAULT_MASTER_EXAM_ID") || null;
}

/** Fetch a page's raw HTML with a descriptive User-Agent to be transparent with govt sites. */
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; StartworkingJobScraper/1.0; +https://startworking.in)",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return await res.text();
}

/** Safely parse the request body as JSON; returns `{}` on invalid/missing body. */
async function safeJson(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Shorthand: serialize a value to a JSON Response with CORS headers. */
function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
