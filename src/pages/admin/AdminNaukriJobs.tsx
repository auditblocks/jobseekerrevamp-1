import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, RefreshCw, Save, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const SECRET_KEYS = {
  token: "apify_api_token",
  actor: "apify_actor_id",
  dataset: "apify_dataset_id",
} as const;

interface SyncLogRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_upserted: number | null;
  items_skipped: number | null;
  error_message: string | null;
  apify_run_id: string | null;
  dataset_id: string | null;
}

/** Values last persisted to the database — shown in the summary panel. */
interface SavedConfig {
  hasToken: boolean;
  actorId: string;
  datasetId: string;
  lastUpdatedAt: string | null;
}

const emptySaved: SavedConfig = {
  hasToken: false,
  actorId: "",
  datasetId: "",
  lastUpdatedAt: null,
};

const AdminNaukriJobs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savedConfig, setSavedConfig] = useState<SavedConfig>(emptySaved);
  const [editActorId, setEditActorId] = useState("");
  const [editDatasetId, setEditDatasetId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [logs, setLogs] = useState<SyncLogRow[]>([]);

  const loadSecrets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_integration_secrets" as never)
        .select("secret_key, secret_value, updated_at")
        .in("secret_key", [SECRET_KEYS.token, SECRET_KEYS.actor, SECRET_KEYS.dataset]);

      if (error) throw error;

      const rows = (data || []) as {
        secret_key: string;
        secret_value: string;
        updated_at: string | null;
      }[];
      const map = Object.fromEntries(rows.map((r) => [r.secret_key, r.secret_value]));
      const times = rows.map((r) => r.updated_at).filter(Boolean) as string[];
      const lastUpdatedAt =
        times.length > 0
          ? times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!
          : null;

      const tok = map[SECRET_KEYS.token]?.trim() ?? "";
      const actor = map[SECRET_KEYS.actor]?.trim() ?? "";
      const dataset = map[SECRET_KEYS.dataset]?.trim() ?? "";

      setSavedConfig({
        hasToken: tok.length > 0,
        actorId: actor,
        datasetId: dataset,
        lastUpdatedAt,
      });
      setEditActorId(actor);
      setEditDatasetId(dataset);
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to load integration settings");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from("naukri_sync_log" as never)
      .select("*")
      .order("started_at", { ascending: false })
      .limit(25);

    if (!error && data) {
      setLogs(data as unknown as SyncLogRow[]);
    }
  };

  useEffect(() => {
    loadSecrets();
    loadLogs();
  }, []);

  const upsertSecret = async (key: string, value: string) => {
    const { error } = await supabase.from("admin_integration_secrets" as never).upsert(
      {
        secret_key: key,
        secret_value: value,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      },
      { onConflict: "secret_key" },
    );
    if (error) throw error;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (newToken.trim()) {
        await upsertSecret(SECRET_KEYS.token, newToken.trim());
        setNewToken("");
      }
      await upsertSecret(SECRET_KEYS.actor, editActorId.trim());
      await upsertSecret(SECRET_KEYS.dataset, editDatasetId.trim());
      toast.success("Configuration saved");
      await loadSecrets();
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const canRunSync =
    savedConfig.hasToken &&
    (savedConfig.actorId.trim().length > 0 || savedConfig.datasetId.trim().length > 0);

  const handleSyncNow = async () => {
    if (!canRunSync) {
      toast.error("Save a valid API token and Actor ID or Dataset ID first.");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-naukri-apify", {
        body: {},
      });
      if (error) {
        const ctx = (error as { context?: { body?: string } })?.context?.body;
        let msg = error.message;
        if (typeof ctx === "string") {
          try {
            const j = JSON.parse(ctx) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            /* ignore */
          }
        }
        throw new Error(msg);
      }
      const d = data as { success?: boolean; error?: string; items_upserted?: number };
      if (d?.success === false && d?.error) throw new Error(d.error);
      toast.success(
        typeof d?.items_upserted === "number"
          ? `Sync finished: ${d.items_upserted} jobs upserted`
          : "Sync finished",
      );
      await loadLogs();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const displayValue = (v: string) => (v.trim() ? v : "—");
  const formatSavedAt = (iso: string | null) =>
    iso ? format(new Date(iso), "MMM d, yyyy · HH:mm") : "—";

  return (
    <AdminLayout>
      <Helmet>
        <title>Naukri (Apify) jobs | Admin</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Private jobs — Naukri / Apify</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Save your API configuration below. The summary shows what is stored in the database. Use{" "}
            <strong>Run sync</strong> to pull jobs from Apify manually (cron also runs on a schedule).
          </p>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 flex gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p>
              Store the Apify API token here (superadmin-only table). Never put the token in{" "}
              <code className="text-xs bg-muted px-1 rounded">system_settings</code> — regular users can
              read that table.
            </p>
          </CardContent>
        </Card>

        {/* Saved config (read-only) + Run sync beside it */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Saved configuration</CardTitle>
            <CardDescription>
              This reflects the last successful save. Edit values in the section below, then click{" "}
              <strong>Save configuration</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8">
                <div className="flex-1 space-y-4 min-w-0">
                  <dl className="grid gap-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-border/60 pb-3">
                      <dt className="text-muted-foreground shrink-0 sm:w-40">Apify API token</dt>
                      <dd className="font-medium flex items-center gap-2">
                        {savedConfig.hasToken ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            Configured (hidden)
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            Not set — add one below and save
                          </>
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-border/60 pb-3">
                      <dt className="text-muted-foreground shrink-0 sm:w-40">Actor ID</dt>
                      <dd className="font-mono text-xs sm:text-sm break-all">{displayValue(savedConfig.actorId)}</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-border/60 pb-3">
                      <dt className="text-muted-foreground shrink-0 sm:w-40">Dataset ID (override)</dt>
                      <dd className="font-mono text-xs sm:text-sm break-all">
                        {displayValue(savedConfig.datasetId)}
                      </dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-4">
                      <dt className="text-muted-foreground shrink-0 sm:w-40">Last updated</dt>
                      <dd className="text-muted-foreground">{formatSavedAt(savedConfig.lastUpdatedAt)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="lg:w-52 shrink-0 flex lg:flex-col justify-center lg:justify-center gap-3 lg:border-l lg:pl-8 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                  <Button
                    size="lg"
                    className="w-full"
                    variant="secondary"
                    onClick={handleSyncNow}
                    disabled={syncing || !canRunSync}
                    title={
                      !canRunSync
                        ? "Save token and Actor ID or Dataset ID first"
                        : "Fetch latest dataset from Apify and upsert jobs"
                    }
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Run sync now
                  </Button>
                  {!canRunSync && !loading ? (
                    <p className="text-xs text-muted-foreground text-center lg:text-left">
                      Requires saved token + actor or dataset ID.
                    </p>
                  ) : canRunSync && !loading ? (
                    <p className="text-xs text-muted-foreground text-center lg:text-left">
                      {savedConfig.datasetId.trim()
                        ? "Imports the saved dataset only (no new Apify run)."
                        : "Starts a new Apify actor run, then imports results (often 1–2 minutes; leave the page open)."}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit form — Save only */}
        <Card>
          <CardHeader>
            <CardTitle>Update configuration</CardTitle>
            <CardDescription>
              Changes apply only after you click <strong>Save configuration</strong>. They will appear in{" "}
              <strong>Saved configuration</strong> above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? null : (
              <>
                <div className="space-y-2">
                  <Label>Apify API token</Label>
                  <p className="text-xs text-muted-foreground">
                    {savedConfig.hasToken
                      ? "Leave blank to keep the current token. Enter a new value only to replace it."
                      : "Required for sync."}
                  </p>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={
                      savedConfig.hasToken ? "New token (optional)" : "apify_api_…"
                    }
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actor-edit">Actor ID</Label>
                  <Input
                    id="actor-edit"
                    placeholder="e.g. GLb4E7UrStD7XLJxO"
                    value={editActorId}
                    onChange={(e) => setEditActorId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-edit">Dataset ID (optional)</Label>
                  <Input
                    id="dataset-edit"
                    placeholder="Fixed dataset instead of latest successful run"
                    value={editDatasetId}
                    onChange={(e) => setEditDatasetId(e.target.value)}
                  />
                </div>
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save configuration
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sync runs</CardTitle>
            <CardDescription>Last 25 executions (from Edge Function)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upserted</TableHead>
                  <TableHead>Skipped</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No runs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.started_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>{log.status}</TableCell>
                      <TableCell>{log.items_upserted ?? "—"}</TableCell>
                      <TableCell>{log.items_skipped ?? "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-destructive">
                        {log.error_message ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNaukriJobs;
