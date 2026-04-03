import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { externalKeyFromUrl, mapApifyItemToRow } from "./map-item.ts";

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

async function isAuthorizedRequest(req: Request, supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token && serviceKey && token === serviceKey) {
    return true;
  }

  const cronSecret = Deno.env.get("NAUKRI_SYNC_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return true;
  }

  if (!token) return false;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;

  const [{ data: roleData }, { data: profileData }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  return !!roleData || profileData?.role === "superadmin";
}

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

const TERMINAL_RUN_STATUSES = new Set([
  "SUCCEEDED",
  "FAILED",
  "ABORTED",
  "TIMED-OUT",
]);

function isTerminalRunStatus(status: string): boolean {
  return TERMINAL_RUN_STATUSES.has(status);
}

async function resolveDatasetFromLastSuccess(
  token: string,
  actorId: string,
  overrideDatasetId: string,
): Promise<{ datasetId: string; runId: string | null } | { error: string }> {
  if (overrideDatasetId) {
    return { datasetId: overrideDatasetId, runId: null };
  }
  if (!actorId) {
    return { error: "Configure apify_actor_id or apify_dataset_id in Admin → Naukri jobs." };
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
        "No successful Apify run with a dataset found for this actor. Run sync without import_only to start a scrape, or run the actor once in Apify Console.",
    };
  }
  return { datasetId: String(ds), runId: runId ? String(runId) : null };
}

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

/** Start actor (POST input), wait up to 60s on Apify side, then poll until terminal or wall limit. */
async function runActorAndResolveDataset(
  token: string,
  actorId: string,
  actorInput: Record<string, unknown>,
): Promise<{ datasetId: string; runId: string } | { error: string }> {
  if (!actorId) {
    return { error: "Configure apify_actor_id in Admin → Naukri jobs." };
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
  const pollDeadline = Date.now() + 85_000;

  while (!isTerminalRunStatus(String(run.status ?? ""))) {
    if (Date.now() > pollDeadline) {
      return {
        error:
          `Actor run ${runId} is still ${run.status ?? "RUNNING"} after the wait limit (~2.5 min). ` +
          "Wait for it to finish in Apify Console, then use Run sync with body { \"import_only\": true } or clear dataset override to pull the latest successful run.",
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

interface SyncBodyOptions {
  importOnly: boolean;
  actorInput: Record<string, unknown>;
}

function parseSyncBody(raw: string | null): SyncBodyOptions {
  const defaults: SyncBodyOptions = {
    importOnly: false,
    actorInput: { desired_results: 100 },
  };
  if (!raw?.trim()) return defaults;
  try {
    const b = JSON.parse(raw) as Record<string, unknown>;
    const importOnly = b.import_only === true || b.importOnly === true;
    const actorInput: Record<string, unknown> = { ...defaults.actorInput };
    if (b.actor_input && typeof b.actor_input === "object" && !Array.isArray(b.actor_input)) {
      Object.assign(actorInput, b.actor_input as Record<string, unknown>);
    }
    if (typeof b.desired_results === "number" && Number.isFinite(b.desired_results)) {
      actorInput.desired_results = b.desired_results;
    }
    return { importOnly, actorInput };
  } catch {
    return defaults;
  }
}

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

  const bodyText = req.method === "POST" ? await req.text() : "";
  const syncOptions = parseSyncBody(bodyText || null);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!(await isAuthorizedRequest(req, supabase))) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const logInsert = await supabase
    .from("naukri_sync_log")
    .insert({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (logInsert.error) {
    console.error("naukri_sync_log insert failed", logInsert.error);
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
    const apifyToken = await getSecret(supabase, "apify_api_token");
    if (!apifyToken) {
      await finishLog("error", { error_message: "Missing apify_api_token in admin_integration_secrets" });
      return json({ success: false, error: "Apify API token not configured." }, 400);
    }

    const actorId = await getSecret(supabase, "apify_actor_id");
    const datasetOverride = await getSecret(supabase, "apify_dataset_id");

    let resolved: { datasetId: string; runId: string | null } | { error: string };

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
    const scrapedAt = new Date().toISOString();

    for (const raw of items) {
      const mapped = mapApifyItemToRow(raw);
      if (!mapped) {
        skipped++;
        continue;
      }
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
          source: "naukri",
          raw_item: mapped.raw_item,
          is_active: true,
          scraped_at: scrapedAt,
        },
        { onConflict: "external_key" },
      );
      if (upErr) {
        console.error("naukri_jobs upsert error", upErr);
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
      dataset_id: resolved.datasetId,
      apify_run_id: resolved.runId,
      log_id: logId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-naukri-apify", e);
    await finishLog("error", { error_message: msg });
    return json({ success: false, error: msg }, 500);
  }
});
