/**
 * @fileoverview Ops health command center — a single admin dashboard combining
 * signals that today live scattered across separate admin pages: Apify sync
 * success rate, govt/recruiter scraper freshness, email campaign delivery, and
 * payment failure rate. Read-only; no new backend beyond existing superadmin
 * RLS policies on each source table. Anomaly flags are simple thresholds, not
 * ML — the goal is "does anything need a human to look" at a glance.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Health = "ok" | "warning" | "critical" | "unknown";

interface PipelineHealth {
  pipeline: string;
  runsLast24h: number;
  successLast24h: number;
  lastStatus: string | null;
  lastRunAt: string | null;
  health: Health;
}

interface OpsSnapshot {
  pipelines: PipelineHealth[];
  govtJobsLast24h: number;
  govtJobsLast7d: number;
  govtLastPostedAt: string | null;
  recruitersLast7d: number;
  campaignSentLast7d: number;
  campaignDeliveredLast7d: number;
  campaignOpenedLast7d: number;
  paymentsCompletedLast24h: number;
  paymentsFailedLast24h: number;
}

const HEALTH_BADGE: Record<Health, { label: string; className: string; icon: JSX.Element }> = {
  ok: {
    label: "Healthy",
    className: "bg-green-600 hover:bg-green-600",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  warning: {
    label: "Degraded",
    className: "bg-amber-500 hover:bg-amber-500 text-amber-950",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  critical: {
    label: "Failing",
    className: "bg-destructive hover:bg-destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  unknown: {
    label: "No data",
    className: "bg-muted text-muted-foreground hover:bg-muted",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

function pipelineHealthFor(runs: { status: string }[]): Health {
  if (runs.length === 0) return "unknown";
  const last3 = runs.slice(0, 3);
  const successCount = last3.filter((r) => r.status === "success").length;
  const rate = successCount / last3.length;
  if (rate >= 0.8) return "ok";
  if (rate >= 0.5) return "warning";
  return "critical";
}

async function loadSnapshot(): Promise<OpsSnapshot> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [syncLogRes, govt24hRes, govt7dRes, govtLastRes, recruiters7dRes, campaignsRes, paymentsRes] =
    await Promise.all([
      supabase
        .from("naukri_sync_log" as never)
        .select("pipeline, status, started_at")
        .order("started_at", { ascending: false })
        .limit(40),
      supabase.from("govt_jobs" as never).select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabase.from("govt_jobs" as never).select("id", { count: "exact", head: true }).gte("created_at", since7d),
      supabase
        .from("govt_jobs" as never)
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("recruiters" as never)
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7d),
      supabase
        .from("email_campaigns" as never)
        .select("sent_count, delivered_count, opened_count")
        .gte("created_at", since7d),
      supabase
        .from("subscription_history" as never)
        .select("status")
        .gte("created_at", since24h)
        .in("status", ["completed", "failed"]),
    ]);

  const syncRows = (syncLogRes.data ?? []) as { pipeline: string | null; status: string; started_at: string }[];
  const pipelineNames = Array.from(new Set(syncRows.map((r) => r.pipeline || "unknown")));
  const pipelines: PipelineHealth[] = pipelineNames.map((name) => {
    const runs = syncRows.filter((r) => (r.pipeline || "unknown") === name);
    const runsLast24h = runs.filter((r) => r.started_at >= since24h);
    return {
      pipeline: name,
      runsLast24h: runsLast24h.length,
      successLast24h: runsLast24h.filter((r) => r.status === "success").length,
      lastStatus: runs[0]?.status ?? null,
      lastRunAt: runs[0]?.started_at ?? null,
      health: pipelineHealthFor(runs),
    };
  });

  const campaignRows = (campaignsRes.data ?? []) as {
    sent_count: number | null;
    delivered_count: number | null;
    opened_count: number | null;
  }[];
  const campaignSentLast7d = campaignRows.reduce((sum, r) => sum + (r.sent_count ?? 0), 0);
  const campaignDeliveredLast7d = campaignRows.reduce((sum, r) => sum + (r.delivered_count ?? 0), 0);
  const campaignOpenedLast7d = campaignRows.reduce((sum, r) => sum + (r.opened_count ?? 0), 0);

  const paymentRows = (paymentsRes.data ?? []) as { status: string }[];

  return {
    pipelines,
    govtJobsLast24h: govt24hRes.count ?? 0,
    govtJobsLast7d: govt7dRes.count ?? 0,
    govtLastPostedAt: (govtLastRes.data as { created_at: string } | null)?.created_at ?? null,
    recruitersLast7d: recruiters7dRes.count ?? 0,
    campaignSentLast7d,
    campaignDeliveredLast7d,
    campaignOpenedLast7d,
    paymentsCompletedLast24h: paymentRows.filter((r) => r.status === "completed").length,
    paymentsFailedLast24h: paymentRows.filter((r) => r.status === "failed").length,
  };
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

const AdminOpsHealth = () => {
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await loadSnapshot();
      setSnapshot(s);
    } catch (e) {
      console.error("Failed to load ops health snapshot:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const paymentFailureRate =
    snapshot && snapshot.paymentsCompletedLast24h + snapshot.paymentsFailedLast24h > 0
      ? snapshot.paymentsFailedLast24h / (snapshot.paymentsCompletedLast24h + snapshot.paymentsFailedLast24h)
      : 0;
  const paymentHealth: Health =
    !snapshot || snapshot.paymentsCompletedLast24h + snapshot.paymentsFailedLast24h === 0
      ? "unknown"
      : paymentFailureRate <= 0.1
        ? "ok"
        : paymentFailureRate <= 0.3
          ? "warning"
          : "critical";

  const govtHealth: Health = !snapshot
    ? "unknown"
    : snapshot.govtJobsLast7d === 0
      ? "critical"
      : snapshot.govtJobsLast24h === 0
        ? "warning"
        : "ok";

  return (
    <AdminLayout>
      <Helmet>
        <title>Ops health | Admin</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ops health</h1>
            <p className="text-muted-foreground text-sm mt-1">
              One glance across scrapers, campaigns, and payments. Thresholds, not ML — flags a
              tile red/amber when it needs a human to look.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {loading && !snapshot ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : snapshot ? (
          <>
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Scraping pipelines
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {snapshot.pipelines.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-sm text-muted-foreground">
                      No Apify sync runs recorded yet.
                    </CardContent>
                  </Card>
                ) : (
                  snapshot.pipelines.map((p) => (
                    <Card key={p.pipeline}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base capitalize">{p.pipeline}</CardTitle>
                          <Badge className={cn("gap-1 font-normal", HEALTH_BADGE[p.health].className)}>
                            {HEALTH_BADGE[p.health].icon}
                            {HEALTH_BADGE[p.health].label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Last 24h: </span>
                          {p.successLast24h}/{p.runsLast24h} succeeded
                        </p>
                        <p>
                          <span className="text-muted-foreground">Last run: </span>
                          {p.lastRunAt
                            ? `${formatDistanceToNow(new Date(p.lastRunAt), { addSuffix: true })} (${p.lastStatus})`
                            : "—"}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Govt jobs scraper</CardTitle>
                      <Badge className={cn("gap-1 font-normal", HEALTH_BADGE[govtHealth].className)}>
                        {HEALTH_BADGE[govtHealth].icon}
                        {HEALTH_BADGE[govtHealth].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">New postings 24h: </span>
                      {snapshot.govtJobsLast24h}
                    </p>
                    <p>
                      <span className="text-muted-foreground">New postings 7d: </span>
                      {snapshot.govtJobsLast7d}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Last posting: </span>
                      {snapshot.govtLastPostedAt
                        ? formatDistanceToNow(new Date(snapshot.govtLastPostedAt), { addSuffix: true })
                        : "—"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Recruiter directory</CardTitle>
                    <CardDescription>Freshness signal, not pass/fail</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>
                      <span className="text-muted-foreground">New recruiters (7d): </span>
                      {snapshot.recruitersLast7d}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Campaigns &amp; payments (last 7d / 24h)
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Email delivery (7d)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Sent: </span>
                      {snapshot.campaignSentLast7d}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Delivered: </span>
                      {pct(snapshot.campaignDeliveredLast7d, snapshot.campaignSentLast7d)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Opened: </span>
                      {pct(snapshot.campaignOpenedLast7d, snapshot.campaignSentLast7d)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Payment failures (24h)</CardTitle>
                      <Badge className={cn("gap-1 font-normal", HEALTH_BADGE[paymentHealth].className)}>
                        {HEALTH_BADGE[paymentHealth].icon}
                        {HEALTH_BADGE[paymentHealth].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Completed: </span>
                      {snapshot.paymentsCompletedLast24h}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Failed: </span>
                      {snapshot.paymentsFailedLast24h}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Failure rate: </span>
                      {pct(
                        snapshot.paymentsFailedLast24h,
                        snapshot.paymentsCompletedLast24h + snapshot.paymentsFailedLast24h,
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminOpsHealth;
