/**
 * @module sync-linkedin-apify
 * @description Supabase Edge Function that synchronises LinkedIn job listings from
 * an Apify actor (default: curious_coder~linkedin-jobs-scraper) into the
 * `naukri_jobs` table with `source = "linkedin"`. Supports both full actor runs
 * and import-only mode (pulling from an existing dataset). LinkedIn search URLs
 * are loaded from `admin_integration_secrets` and can be overridden via the
 * request body. Uses a dedicated or shared Apify API token.
 *
 * Accepts POST body: { import_only?: boolean, actor_input?: { urls?: string[], ... } }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { isAuthorizedAdminRequest } from "../_shared/admin-auth.ts";
import { externalKeyFromUrl, mapLinkedInItemToRow } from "./map-linkedin-item.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Reads a single integration secret from the admin_integration_secrets table. */
async function getSecret(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("admin_integration_secrets")
    .select("secret_value")
    .eq("secret_key", key)
    .maybeSingle();
  if (error || !data?.secret_value) return "";
  return String(data.secret_value).trim();
}

/** Parses newline-separated LinkedIn search URLs stored as a single secret value. */
function parseLinkedInSearchUrlsFromSecret(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^https?:\/\//i.test(s));
}

/** Apify run statuses that indicate the actor is no longer executing. */
const TERMINAL_RUN_STATUSES = new Set([
  "SUCCEEDED",
  "FAILED",
  "ABORTED",
  "TIMED-OUT",
]);

function isTerminalRunStatus(status: string): boolean {
  return TERMINAL_RUN_STATUSES.has(status);
}

/**
 * Resolves the Apify dataset to import from. Prefers an explicit override;
 * otherwise fetches the most recent successful run for the LinkedIn actor.
 */
async function resolveDatasetFromLastSuccess(
  token: string,
  actorId: string,
  overrideDatasetId: string,
): Promise<{ datasetId: string; runId: string | null } | { error: string }> {
  if (overrideDatasetId) {
    return { datasetId: overrideDatasetId, runId: null };
  }
  if (!actorId) {
    return {
      error:
        "Configure apify_linkedin_actor_id or apify_linkedin_dataset_id in Admin → Apify jobs (LinkedIn tab).",
    };
  }
  const url =
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${
      encodeURIComponent(token)
    }&status=SUCCEEDED&limit=1&desc=true`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    return { error: `Apify list runs failed: ${res.status} ${t.slice(0, 300)}` };
  }
  const j = await res.json() as Record<string, unknown>;
  const data = j?.data as Record<string, unknown> | undefined;
  const items = (data?.items ?? j?.items ?? []) as unknown[];
  const run = Array.isArray(items) && items.length ? (items[0] as Record<string, unknown>) : null;
  const ds = run?.defaultDatasetId ?? run?.default_dataset_id;
  const runId = run?.id ?? null;
  if (!ds) {
    return {
      error:
        "No successful LinkedIn Apify run with a dataset found. Run sync without import_only after saving search URLs, or run the actor in Apify Console.",
    };
  }
  return { datasetId: String(ds), runId: runId ? String(runId) : null };
}

/** Fetches the current state of an Apify actor run (used during polling). */
async function fetchActorRun(
  token: string,
  runId: string,
): Promise<Record<string, unknown> | { error: string }> {
  const url =
    `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${
      encodeURIComponent(token)
    }`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    return { error: `Apify get run failed: ${res.status} ${t.slice(0, 300)}` };
  }
  const j = await res.json() as { data?: Record<string, unknown> };
  if (!j.data) return { error: "Apify get run: empty response" };
  return j.data;
}

/** Starts the LinkedIn Apify actor, waits up to ~2.5 min for completion, then returns the dataset ID. */
async function runActorAndResolveDataset(
  token: string,
  actorId: string,
  actorInput: Record<string, unknown>,
): Promise<{ datasetId: string; runId: string } | { error: string }> {
  if (!actorId) {
    return { error: "Configure apify_linkedin_actor_id in Admin → Apify jobs (LinkedIn tab)." };
  }
  const startUrl =
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${
      encodeURIComponent(token)
    }&waitForFinish=60`;
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(actorInput),
  });
  if (!startRes.ok) {
    const t = await startRes.text();
    return { error: `Apify start run failed: ${startRes.status} ${t.slice(0, 400)}` };
  }
  const startJson = await startRes.json() as { data?: Record<string, unknown> };
  let run = startJson.data;
  if (!run?.id) {
    return { error: "Apify start run returned no run id." };
  }
  const runId = String(run.id);
  // Poll for up to ~85 s (60 s Apify-side wait + 25 s buffer) with 5 s intervals
  const pollDeadline = Date.now() + 85_000;

  while (!isTerminalRunStatus(String(run.status ?? ""))) {
    if (Date.now() > pollDeadline) {
      return {
        error:
          `Actor run ${runId} is still ${run.status ?? "RUNNING"} after the wait limit (~2.5 min). ` +
          "Wait in Apify Console, then run sync with import_only: true.",
      };
    }
    await new Promise((r) => setTimeout(r, 5000));
    const next = await fetchActorRun(token, runId);
    if ("error" in next && next.error) return { error: next.error };
    run = next as Record<string, unknown>;
  }

  if (run.status !== "SUCCEEDED") {
    const msg = typeof run.statusMessage === "string" ? run.statusMessage : "";
    return {
      error: `Apify run ${runId} ended as ${run.status}${msg ? `: ${msg}` : ""}`,
    };
  }
  const ds = run.defaultDatasetId ?? run.default_dataset_id;
  if (!ds) {
    return { error: "Successful Apify run has no defaultDatasetId." };
  }
  return { datasetId: String(ds), runId };
}

interface LinkedInSyncBodyOptions {
  importOnly: boolean;
  actorInput: Record<string, unknown>;
}

/** Parses the optional JSON body, merging caller overrides with secret-sourced search URLs. */
function parseLinkedInSyncBody(raw: string | null, urlsFromSecret: string[]): LinkedInSyncBodyOptions {
  const baseUrls = [...urlsFromSecret];
  const defaults: LinkedInSyncBodyOptions = {
    importOnly: false,
    actorInput: { urls: baseUrls },
  };
  if (!raw?.trim()) return defaults;
  try {
    const b = JSON.parse(raw) as Record<string, unknown>;
    const importOnly = b.import_only === true || b.importOnly === true;
    const actorInput: Record<string, unknown> = { urls: [...baseUrls] };
    if (b.actor_input && typeof b.actor_input === "object" && !Array.isArray(b.actor_input)) {
      const ai = b.actor_input as Record<string, unknown>;
      Object.assign(actorInput, ai);
      if (Array.isArray(ai.urls)) {
        actorInput.urls = ai.urls;
      }
    }
    return { importOnly, actorInput };
  } catch {
    return defaults;
  }
}

/** Paginates through the Apify dataset API in batches of 500, up to 20 000 items max. */
async function fetchAllDatasetItems(
  token: string,
  datasetId: string,
): Promise<{ items: unknown[] } | { error: string }> {
  const out: unknown[] = [];
  let offset = 0;
  const limit = 500;
  for (;;) {
    const u =
      `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${
        encodeURIComponent(token)
      }&format=json&clean=true&limit=${limit}&offset=${offset}`;
    const res = await fetch(u);
    if (!res.ok) {
      const t = await res.text();
      return { error: `Apify dataset items failed: ${res.status} ${t.slice(0, 300)}` };
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 20000) break;
  }
  return { items: out };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!(await isAuthorizedAdminRequest(req, supabase))) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const urlsSecretRaw = await getSecret(supabase, "apify_linkedin_search_urls");
  const urlsFromSecret = parseLinkedInSearchUrlsFromSecret(urlsSecretRaw);

  const bodyText = req.method === "POST" ? await req.text() : "";
  const syncOptions = parseLinkedInSyncBody(bodyText || null, urlsFromSecret);

  const logInsert = await supabase
    .from("naukri_sync_log")
    .insert({
      status: "running",
      started_at: new Date().toISOString(),
      pipeline: "linkedin",
    })
    .select("id")
    .single();

  if (logInsert.error) {
    console.error("naukri_sync_log insert failed (linkedin)", logInsert.error);
  }
  const logId = logInsert.data?.id as string | undefined;
  const finishLog = async (
    status: "success" | "error",
    extra: Record<string, unknown> = {},
  ) => {
    if (!logId) return;
    await supabase
      .from("naukri_sync_log")
      .update({
        status,
        finished_at: new Date().toISOString(),
        ...extra,
      })
      .eq("id", logId);
  };

  try {
    // LinkedIn can use its own Apify token or fall back to the shared one
    const linkedinOverrideToken = await getSecret(supabase, "apify_linkedin_api_token");
    const sharedToken = await getSecret(supabase, "apify_api_token");
    const apifyToken = linkedinOverrideToken || sharedToken;
    if (!apifyToken) {
      await finishLog("error", {
        error_message: "Missing Apify token: set apify_linkedin_api_token or apify_api_token.",
      });
      return json(
        { success: false, error: "Apify API token not configured (shared or LinkedIn-specific)." },
        400,
      );
    }

    // Default to the community LinkedIn scraper if no custom actor is configured
    const actorRaw = await getSecret(supabase, "apify_linkedin_actor_id");
    const actorId = actorRaw || "curious_coder~linkedin-jobs-scraper";
    const datasetOverride = await getSecret(supabase, "apify_linkedin_dataset_id");

    const urls = syncOptions.actorInput.urls;
    const hasUrls = Array.isArray(urls) && urls.length > 0;

    if (!datasetOverride && !syncOptions.importOnly && !hasUrls) {
      await finishLog("error", {
        error_message:
          "LinkedIn scraper needs at least one https search URL (Admin LinkedIn tab) or apify_linkedin_dataset_id / import_only.",
      });
      return json({
        success: false,
        error:
          "Save one or more LinkedIn job search URLs (https://…) in Admin → Apify jobs → LinkedIn, or set a dataset ID / use import_only.",
      }, 400);
    }

    let resolved: { datasetId: string; runId: string | null } | { error: string };

    // Decision tree: explicit dataset → import_only (last success) → start a new run
    if (datasetOverride) {
      resolved = await resolveDatasetFromLastSuccess(apifyToken, actorId, datasetOverride);
    } else if (syncOptions.importOnly) {
      resolved = await resolveDatasetFromLastSuccess(apifyToken, actorId, "");
    } else {
      const runResult = await runActorAndResolveDataset(
        apifyToken,
        actorId,
        syncOptions.actorInput,
      );
      if ("error" in runResult) {
        resolved = runResult;
      } else {
        resolved = { datasetId: runResult.datasetId, runId: runResult.runId };
      }
    }

    if ("error" in resolved) {
      await finishLog("error", { error_message: resolved.error });
      return json({ success: false, error: resolved.error }, 502);
    }

    const { items, error: fetchErr } = await fetchAllDatasetItems(
      apifyToken,
      resolved.datasetId,
    );
    if (fetchErr) {
      await finishLog("error", {
        error_message: fetchErr,
        dataset_id: resolved.datasetId,
        apify_run_id: resolved.runId,
      });
      return json({ success: false, error: fetchErr }, 502);
    }

    let upserted = 0;
    let skipped = 0;
    let unmappedLogged = 0;
    const seenApplyUrls = new Set<string>();
    let duplicateApplyUrlsInDataset = 0;
    const scrapedAt = new Date().toISOString();

    // Map each Apify dataset item → DB row; skip items that lack a title or valid URL
    for (const raw of items) {
      const mapped = mapLinkedInItemToRow(raw);
      if (!mapped) {
        skipped++;
        if (unmappedLogged < 5 && raw && typeof raw === "object") {
          unmappedLogged++;
          const keys = Object.keys(raw as Record<string, unknown>);
          console.warn(
            `sync-linkedin-apify: skipped row (needs title + http job URL). Keys: ${keys.slice(0, 20).join(", ")}`,
          );
        }
        continue;
      }
      const urlNorm = mapped.apply_url.trim();
      if (seenApplyUrls.has(urlNorm)) duplicateApplyUrlsInDataset++;
      else seenApplyUrls.add(urlNorm);

      const external_key = await externalKeyFromUrl(mapped.apply_url);
      const { error: upErr } = await supabase.from("naukri_jobs").upsert(
        {
          title: mapped.title,
          company_name: mapped.company_name,
          location: mapped.location,
          apply_url: mapped.apply_url,
          external_key,
          posted_at: mapped.posted_at,
          summary: mapped.summary,
          salary_text: mapped.salary_text,
          experience_text: mapped.experience_text,
          skills: mapped.skills,
          source: "linkedin",
          raw_item: mapped.raw_item,
          is_active: true,
          scraped_at: scrapedAt,
        },
        { onConflict: "external_key" },
      );
      if (upErr) {
        console.error("naukri_jobs upsert error (linkedin)", upErr);
        skipped++;
      } else {
        upserted++;
      }
    }

    await finishLog("success", {
      items_upserted: upserted,
      items_skipped: skipped,
      dataset_id: resolved.datasetId,
      apify_run_id: resolved.runId,
    });

    return json({
      success: true,
      items_upserted: upserted,
      items_skipped: skipped,
      dataset_item_count: items.length,
      unique_apply_urls: seenApplyUrls.size,
      duplicate_apply_urls_in_dataset: duplicateApplyUrlsInDataset,
      dataset_id: resolved.datasetId,
      apify_run_id: resolved.runId,
      log_id: logId,
      pipeline: "linkedin",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-linkedin-apify", e);
    await finishLog("error", { error_message: msg });
    return json({ success: false, error: msg }, 500);
  }
});
