/**
 * @fileoverview Live progress panel for the Apify scrape → import pipelines.
 *
 * The `sync-naukri-apify` / `sync-linkedin-apify` edge functions patch their
 * `naukri_sync_log` row as they move through each stage (read config → run the
 * Apify actor → download the dataset → import into `naukri_jobs`). This panel
 * polls the newest row for a pipeline and renders that stage machine, so an
 * admin can watch a scrape happen instead of staring at a spinner.
 *
 * It also surfaces runs started by the cron schedule, so an admin who opens the
 * page mid-scrape sees the run in flight rather than a stale summary.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncPipeline = "naukri" | "linkedin";

export interface SyncProgressRow {
  id: string;
  pipeline: string | null;
  status: "running" | "success" | "error" | string;
  phase: string | null;
  phase_message: string | null;
  actor_status: string | null;
  progress_current: number | null;
  progress_total: number | null;
  dataset_item_count: number | null;
  items_upserted: number | null;
  items_skipped: number | null;
  error_message: string | null;
  apify_run_id: string | null;
  dataset_id: string | null;
  trigger_source: string | null;
  run_mode: string | null;
  started_at: string;
  finished_at: string | null;
  updated_at: string | null;
}

const SELECT_COLUMNS =
  "id, pipeline, status, phase, phase_message, actor_status, progress_current, progress_total, " +
  "dataset_item_count, items_upserted, items_skipped, error_message, apify_run_id, dataset_id, " +
  "trigger_source, run_mode, started_at, finished_at, updated_at";

/** How often the running row is re-read. */
const POLL_MS = 2000;
/** A `running` row with no update for this long is probably a dead invocation. */
const STALE_AFTER_MS = 120_000;

interface StepDef {
  key: string;
  label: string;
  /** Phases reported by the edge function that belong to this step. */
  phases: string[];
  /** Skipped when the run only imports an existing dataset. */
  fullRunOnly?: boolean;
}

const STEPS: StepDef[] = [
  { key: "config", label: "Read Apify configuration", phases: ["starting", "resolving"] },
  {
    key: "scrape",
    label: "Scrape jobs on Apify",
    phases: ["actor_starting", "actor_running"],
    fullRunOnly: true,
  },
  {
    key: "download",
    label: "Download scraped results",
    phases: ["resolving_dataset", "fetching_dataset"],
  },
  { key: "import", label: "Import into private jobs", phases: ["importing"] },
];

function stepsFor(row: SyncProgressRow | null): StepDef[] {
  if (row?.run_mode === "import_only") return STEPS.filter((s) => !s.fullRunOnly);
  return STEPS;
}

/** Index of the step the run is currently in; -1 when the phase is unknown. */
function activeStepIndex(row: SyncProgressRow | null, steps: StepDef[]): number {
  if (!row?.phase) return -1;
  if (row.phase === "done") return steps.length;
  return steps.findIndex((s) => s.phases.includes(row.phase!));
}

type StepState = "done" | "active" | "failed" | "pending";

function stepStateAt(
  index: number,
  activeIndex: number,
  status: string,
): StepState {
  if (status === "success") return "done";
  // Unknown phase (e.g. a legacy row written before progress tracking existed).
  if (activeIndex < 0) return "pending";
  if (index < activeIndex) return "done";
  if (index > activeIndex) return "pending";
  return status === "error" ? "failed" : "active";
}

/** Coarse 0–100 completion across all steps, refined by intra-step counts. */
function overallPercent(row: SyncProgressRow | null, steps: StepDef[]): number {
  if (!row) return 0;
  if (row.status === "success") return 100;
  const idx = activeStepIndex(row, steps);
  if (idx < 0) return 0;
  let intra = 0;
  if (row.phase === "importing" && row.progress_total && row.progress_total > 0) {
    intra = Math.min(1, (row.progress_current ?? 0) / row.progress_total);
  } else if (row.phase === "actor_running" || row.phase === "fetching_dataset") {
    intra = 0.5;
  }
  return Math.round(((Math.min(idx, steps.length) + intra) / steps.length) * 100);
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

/** Ticks once a second while `active`, so elapsed timers advance. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/**
 * Polls the newest `naukri_sync_log` row for a pipeline. Polling stays on while
 * the caller has an invocation in flight or the newest row is still `running`.
 */
function useSyncProgress(pipeline: SyncPipeline, isRunning: boolean) {
  const [row, setRow] = useState<SyncProgressRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatest = useCallback(async () => {
    const { data, error } = await supabase
      .from("naukri_sync_log" as never)
      .select(SELECT_COLUMNS)
      .eq("pipeline", pipeline)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) setRow((data as unknown as SyncProgressRow) ?? null);
    setLoading(false);
  }, [pipeline]);

  const rowIsRunning = row?.status === "running";
  const shouldPoll = isRunning || rowIsRunning;

  useEffect(() => {
    void fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    if (!shouldPoll) return;
    const t = window.setInterval(() => void fetchLatest(), POLL_MS);
    return () => window.clearInterval(t);
  }, [shouldPoll, fetchLatest]);

  return { row, loading, refresh: fetchLatest };
}

const STEP_ICON: Record<StepState, JSX.Element> = {
  done: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  active: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <Circle className="h-4 w-4 text-muted-foreground/40" />,
};

interface ApifySyncProgressProps {
  pipeline: SyncPipeline;
  /** True while this page is awaiting its own edge-function invocation. */
  isRunning?: boolean;
  /** Fired once when an in-flight run reaches a terminal state. */
  onRunFinished?: () => void;
}

/**
 * Renders the live stage-by-stage status of the newest sync run for a pipeline.
 */
export function ApifySyncProgress({
  pipeline,
  isRunning = false,
  onRunFinished,
}: ApifySyncProgressProps) {
  const { row, loading, refresh } = useSyncProgress(pipeline, isRunning);
  const live = row?.status === "running" || isRunning;
  const now = useNow(live);

  // Notify the parent exactly once per run when it stops being `running`.
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const current = row?.status ?? null;
    if (prev === "running" && current && current !== "running") {
      onRunFinished?.();
    }
    prevStatusRef.current = current;
  }, [row?.status, onRunFinished]);

  if (loading && !row) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading sync status…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No sync has run for this pipeline yet. Use <strong>Run sync now</strong> to start one — progress
        will appear here.
      </div>
    );
  }

  const steps = stepsFor(row);
  const activeIndex = activeStepIndex(row, steps);
  const percent = overallPercent(row, steps);
  const startedMs = new Date(row.started_at).getTime();
  const endMs = row.finished_at ? new Date(row.finished_at).getTime() : now;
  const elapsed = formatDuration(endMs - startedMs);
  const updatedMs = row.updated_at ? new Date(row.updated_at).getTime() : startedMs;
  const isStale = row.status === "running" && now - updatedMs > STALE_AFTER_MS;

  const statusBadge =
    row.status === "running" ? (
      <Badge variant="secondary" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    ) : row.status === "success" ? (
      <Badge className="gap-1.5 bg-green-600 hover:bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    ) : (
      <Badge variant="destructive" className="gap-1.5">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-4",
        row.status === "running" && "border-primary/40 bg-primary/5",
        row.status === "success" && "border-green-600/30 bg-green-600/5",
        row.status === "error" && "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge}
          <Badge variant="outline" className="font-normal">
            {row.run_mode === "import_only" ? "Import only" : "Full scrape + import"}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {row.trigger_source === "cron" ? "Scheduled" : "Manual"}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {elapsed}
            {row.status === "running" ? " elapsed" : ""}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          className="h-7 px-2 text-xs"
        >
          <RefreshCw className="mr-1.5 h-3 w-3" />
          Refresh
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {row.phase_message ??
              (row.status === "running" ? "Working…" : "Run finished")}
          </span>
          <span className="tabular-nums text-xs text-muted-foreground">{percent}%</span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => {
          const state = stepStateAt(i, activeIndex, row.status);
          const isImportStep = step.key === "import";
          const showCounts =
            isImportStep && (state === "active" || state === "done") && row.progress_total;
          return (
            <li key={step.key} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 shrink-0">{STEP_ICON[state]}</span>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    state === "pending" && "text-muted-foreground",
                    state === "active" && "font-medium",
                    state === "failed" && "text-destructive font-medium",
                  )}
                >
                  {step.label}
                </span>
                {step.key === "scrape" && state === "active" && row.actor_status ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Apify run: {row.actor_status}
                  </span>
                ) : null}
                {showCounts ? (
                  <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                    {row.progress_current ?? 0} / {row.progress_total}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <dl className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3 text-center">
        <div>
          <dt className="text-xs text-muted-foreground">Scraped rows</dt>
          <dd className="text-base font-semibold tabular-nums">
            {row.dataset_item_count ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Imported</dt>
          <dd className="text-base font-semibold tabular-nums text-green-600">
            {row.items_upserted ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Skipped</dt>
          <dd className="text-base font-semibold tabular-nums text-muted-foreground">
            {row.items_skipped ?? 0}
          </dd>
        </div>
      </dl>

      {isStale ? (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            No progress update for {formatDuration(now - updatedMs)}. The edge function may have timed
            out — check the Apify Console, then use <strong>Import last dataset</strong> once the run
            finishes there.
          </span>
        </div>
      ) : null}

      {row.status === "error" && row.error_message ? (
        <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="break-words text-destructive">{row.error_message}</span>
        </div>
      ) : null}

      {row.apify_run_id || row.dataset_id ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {row.apify_run_id ? (
            <span className="break-all">
              Apify run: <code className="rounded bg-muted px-1">{row.apify_run_id}</code>
            </span>
          ) : null}
          {row.dataset_id ? (
            <span className="break-all">
              Dataset: <code className="rounded bg-muted px-1">{row.dataset_id}</code>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
