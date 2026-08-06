/**
 * @file sync-progress — Live progress reporting for the Apify sync pipelines.
 *
 * Both `sync-naukri-apify` and `sync-linkedin-apify` insert a `running` row into
 * `naukri_sync_log` when they start. This helper lets them patch that row as the
 * run moves through its stages (actor start → scrape → dataset download → import)
 * so the admin UI can poll it and show live status instead of a bare spinner.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/** Stages a sync run moves through, in order. Mirrored by the admin UI stepper. */
export type SyncPhase =
  | "starting"
  | "resolving"
  | "actor_starting"
  | "actor_running"
  | "resolving_dataset"
  | "fetching_dataset"
  | "importing"
  | "done"
  | "failed";

export interface SyncProgressPatch {
  phase?: SyncPhase;
  phase_message?: string;
  actor_status?: string;
  progress_current?: number;
  progress_total?: number | null;
  dataset_item_count?: number;
  items_upserted?: number;
  items_skipped?: number;
  apify_run_id?: string | null;
  dataset_id?: string | null;
}

export interface SyncProgressReporter {
  /**
   * Patches the log row. Pass `throttleMs` inside hot loops to avoid one UPDATE
   * per item; throttled calls that arrive too soon are dropped, so always send
   * phase transitions and the final counts unthrottled.
   */
  update(patch: SyncProgressPatch, opts?: { throttleMs?: number }): Promise<void>;
}

/**
 * Creates a reporter bound to one `naukri_sync_log` row. When `logId` is
 * undefined (the initial insert failed) every call becomes a no-op, so progress
 * reporting can never break an otherwise healthy sync.
 */
export function createSyncProgress(
  supabase: SupabaseClient,
  logId: string | undefined,
): SyncProgressReporter {
  let lastWriteAt = 0;
  return {
    async update(patch, opts) {
      if (!logId) return;
      const throttleMs = opts?.throttleMs ?? 0;
      const now = Date.now();
      if (throttleMs > 0 && now - lastWriteAt < throttleMs) return;
      lastWriteAt = now;
      try {
        const { error } = await supabase
          .from("naukri_sync_log")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", logId);
        if (error) console.error("sync progress update failed:", error.message);
      } catch (e) {
        console.error("sync progress update threw:", e instanceof Error ? e.message : e);
      }
    },
  };
}

/**
 * Distinguishes scheduled runs from an admin clicking "Run sync now".
 * Cron calls arrive with the service-role key or the shared cron secret header;
 * anything else authorized is a human in the admin portal.
 */
export function detectTriggerSource(req: Request): "cron" | "manual" {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token && serviceKey && token === serviceKey) return "cron";
  if (req.headers.get("x-cron-secret")) return "cron";
  return "manual";
}
