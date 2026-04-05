import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { AdminPrivateJobsListings } from "@/components/admin/AdminPrivateJobsListings";

const NAUKRI_SECRET_KEYS = {
  token: "apify_api_token",
  actor: "apify_actor_id",
  dataset: "apify_dataset_id",
} as const;

const LINKEDIN_SECRET_KEYS = {
  token: "apify_linkedin_api_token",
  actor: "apify_linkedin_actor_id",
  dataset: "apify_linkedin_dataset_id",
  urls: "apify_linkedin_search_urls",
} as const;

const ALL_ADMIN_KEYS = [
  NAUKRI_SECRET_KEYS.token,
  NAUKRI_SECRET_KEYS.actor,
  NAUKRI_SECRET_KEYS.dataset,
  LINKEDIN_SECRET_KEYS.token,
  LINKEDIN_SECRET_KEYS.actor,
  LINKEDIN_SECRET_KEYS.dataset,
  LINKEDIN_SECRET_KEYS.urls,
];

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
  pipeline?: string | null;
}

interface SavedConfig {
  hasToken: boolean;
  actorId: string;
  datasetId: string;
  lastUpdatedAt: string | null;
}

interface LinkedInSavedConfig {
  hasDedicatedToken: boolean;
  hasSharedTokenFallback: boolean;
  actorId: string;
  datasetId: string;
  searchUrlsRaw: string;
  searchUrlLineCount: number;
  lastUpdatedAt: string | null;
}

const emptySaved: SavedConfig = {
  hasToken: false,
  actorId: "",
  datasetId: "",
  lastUpdatedAt: null,
};

const emptyLinkedInSaved: LinkedInSavedConfig = {
  hasDedicatedToken: false,
  hasSharedTokenFallback: false,
  actorId: "",
  datasetId: "",
  searchUrlsRaw: "",
  searchUrlLineCount: 0,
  lastUpdatedAt: null,
};

type ApifySyncResponse = {
  success?: boolean;
  error?: string;
  items_upserted?: number;
  items_skipped?: number;
  dataset_item_count?: number;
  unique_apply_urls?: number;
  duplicate_apply_urls_in_dataset?: number;
};

function toastSyncStats(d: {
  dataset_item_count?: number;
  unique_apply_urls?: number;
  duplicate_apply_urls_in_dataset?: number;
  items_upserted?: number;
  items_skipped?: number;
}) {
  if (
    typeof d?.dataset_item_count === "number" &&
    typeof d?.unique_apply_urls === "number"
  ) {
    const dup = d.duplicate_apply_urls_in_dataset ?? 0;
    const skip = d.items_skipped ?? 0;
    const parts = [
      `${d.dataset_item_count} rows from Apify`,
      `${d.unique_apply_urls} unique job URLs (${dup} duplicate URL rows in feed)`,
      `${d.items_upserted ?? 0} upserts ok`,
    ];
    if (skip > 0) parts.push(`${skip} skipped (unmapped or DB error)`);
    toast.success(parts.join(" · "));
  } else if (typeof d?.items_upserted === "number") {
    toast.success(`Sync finished: ${d.items_upserted} upserts (see logs for details)`);
  } else {
    toast.success("Sync finished");
  }
}

const AdminNaukriJobs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLinkedIn, setSavingLinkedIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingNaukriImport, setSyncingNaukriImport] = useState(false);
  const [syncingLinkedIn, setSyncingLinkedIn] = useState(false);
  const [syncingLinkedInImport, setSyncingLinkedInImport] = useState(false);
  const [savedConfig, setSavedConfig] = useState<SavedConfig>(emptySaved);
  const [savedLinkedIn, setSavedLinkedIn] = useState<LinkedInSavedConfig>(emptyLinkedInSaved);
  const [editActorId, setEditActorId] = useState("");
  const [editDatasetId, setEditDatasetId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [editLinkedInToken, setEditLinkedInToken] = useState("");
  const [editLinkedInActor, setEditLinkedInActor] = useState("");
  const [editLinkedInDataset, setEditLinkedInDataset] = useState("");
  const [editLinkedInUrls, setEditLinkedInUrls] = useState("");
  const [logs, setLogs] = useState<SyncLogRow[]>([]);

  const loadSecrets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_integration_secrets" as never)
        .select("secret_key, secret_value, updated_at")
        .in("secret_key", ALL_ADMIN_KEYS);

      if (error) throw error;

      const rows = (data || []) as {
        secret_key: string;
        secret_value: string;
        updated_at: string | null;
      }[];
      const map = Object.fromEntries(rows.map((r) => [r.secret_key, r.secret_value]));

      const nauKeySet = new Set<string>([
        NAUKRI_SECRET_KEYS.token,
        NAUKRI_SECRET_KEYS.actor,
        NAUKRI_SECRET_KEYS.dataset,
      ]);
      const nauTimes = rows
        .filter((r) => nauKeySet.has(r.secret_key))
        .map((r) => r.updated_at)
        .filter(Boolean) as string[];
      const nauLast =
        nauTimes.length > 0
          ? nauTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!
          : null;

      const tok = map[NAUKRI_SECRET_KEYS.token]?.trim() ?? "";
      setSavedConfig({
        hasToken: tok.length > 0,
        actorId: map[NAUKRI_SECRET_KEYS.actor]?.trim() ?? "",
        datasetId: map[NAUKRI_SECRET_KEYS.dataset]?.trim() ?? "",
        lastUpdatedAt: nauLast,
      });
      setEditActorId(map[NAUKRI_SECRET_KEYS.actor]?.trim() ?? "");
      setEditDatasetId(map[NAUKRI_SECRET_KEYS.dataset]?.trim() ?? "");

      const liTok = map[LINKEDIN_SECRET_KEYS.token]?.trim() ?? "";
      const liUrlsRaw = map[LINKEDIN_SECRET_KEYS.urls] ?? "";
      const urlLines = liUrlsRaw
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0 && /^https?:\/\//i.test(l));

      const liKeySet = new Set<string>([
        LINKEDIN_SECRET_KEYS.token,
        LINKEDIN_SECRET_KEYS.actor,
        LINKEDIN_SECRET_KEYS.dataset,
        LINKEDIN_SECRET_KEYS.urls,
      ]);
      const liTimes = rows
        .filter((r) => liKeySet.has(r.secret_key))
        .map((r) => r.updated_at)
        .filter(Boolean) as string[];
      const liLast =
        liTimes.length > 0
          ? liTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!
          : null;

      setSavedLinkedIn({
        hasDedicatedToken: liTok.length > 0,
        hasSharedTokenFallback: tok.length > 0,
        actorId: map[LINKEDIN_SECRET_KEYS.actor]?.trim() ?? "",
        datasetId: map[LINKEDIN_SECRET_KEYS.dataset]?.trim() ?? "",
        searchUrlsRaw: liUrlsRaw,
        searchUrlLineCount: urlLines.length,
        lastUpdatedAt: liLast,
      });
      setEditLinkedInActor(map[LINKEDIN_SECRET_KEYS.actor]?.trim() ?? "");
      setEditLinkedInDataset(map[LINKEDIN_SECRET_KEYS.dataset]?.trim() ?? "");
      setEditLinkedInUrls(liUrlsRaw);
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
      .limit(40);

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

  const handleSaveNaukri = async () => {
    setSaving(true);
    try {
      if (newToken.trim()) {
        await upsertSecret(NAUKRI_SECRET_KEYS.token, newToken.trim());
        setNewToken("");
      }
      await upsertSecret(NAUKRI_SECRET_KEYS.actor, editActorId.trim());
      await upsertSecret(NAUKRI_SECRET_KEYS.dataset, editDatasetId.trim());
      toast.success("Naukri configuration saved");
      await loadSecrets();
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLinkedIn = async () => {
    setSavingLinkedIn(true);
    try {
      if (editLinkedInToken.trim()) {
        await upsertSecret(LINKEDIN_SECRET_KEYS.token, editLinkedInToken.trim());
        setEditLinkedInToken("");
      }
      await upsertSecret(LINKEDIN_SECRET_KEYS.actor, editLinkedInActor.trim());
      await upsertSecret(LINKEDIN_SECRET_KEYS.dataset, editLinkedInDataset.trim());
      await upsertSecret(LINKEDIN_SECRET_KEYS.urls, editLinkedInUrls);
      toast.success("LinkedIn configuration saved");
      await loadSecrets();
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to save LinkedIn configuration");
    } finally {
      setSavingLinkedIn(false);
    }
  };

  const canRunNaukriSync =
    savedConfig.hasToken &&
    (savedConfig.actorId.trim().length > 0 || savedConfig.datasetId.trim().length > 0);

  const linkedInEffectiveToken =
    savedLinkedIn.hasDedicatedToken || savedLinkedIn.hasSharedTokenFallback;

  const linkedInCanRunSync =
    linkedInEffectiveToken &&
    (savedLinkedIn.datasetId.trim().length > 0 || savedLinkedIn.searchUrlLineCount > 0);

  const linkedInCanImportOnly = linkedInEffectiveToken;

  const parseInvokeError = (error: { message: string; context?: { body?: string } }) => {
    const ctx = error.context?.body;
    let msg = error.message;
    if (typeof ctx === "string") {
      try {
        const j = JSON.parse(ctx) as { error?: string };
        if (j?.error) msg = j.error;
      } catch {
        /* ignore */
      }
    }
    return msg;
  };

  const runEdgeSync = async (
    fnName: "sync-naukri-apify" | "sync-linkedin-apify",
    body: Record<string, unknown>,
  ) => {
    const { data, error } = await supabase.functions.invoke(fnName, { body });
    if (error) throw new Error(parseInvokeError(error as never));
    const d = data as ApifySyncResponse;
    if (d?.success === false && d?.error) throw new Error(d.error);
    toastSyncStats(d);
    await loadLogs();
  };

  const handleSyncNaukri = async () => {
    if (!canRunNaukriSync) {
      toast.error("Save a valid API token and Actor ID or Dataset ID first.");
      return;
    }
    setSyncing(true);
    try {
      await runEdgeSync("sync-naukri-apify", {});
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncNaukriImportOnly = async () => {
    if (!canRunNaukriSync) {
      toast.error("Save a valid API token and Actor ID or Dataset ID first.");
      return;
    }
    setSyncingNaukriImport(true);
    try {
      await runEdgeSync("sync-naukri-apify", { import_only: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setSyncingNaukriImport(false);
    }
  };

  const handleSyncLinkedIn = async () => {
    if (!linkedInEffectiveToken) {
      toast.error("Set the shared Apify token (Naukri tab) or a LinkedIn-specific token first.");
      return;
    }
    if (!savedLinkedIn.datasetId.trim() && savedLinkedIn.searchUrlLineCount === 0) {
      toast.error("Save at least one https LinkedIn job search URL or a dataset ID first.");
      return;
    }
    setSyncingLinkedIn(true);
    try {
      await runEdgeSync("sync-linkedin-apify", {});
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingLinkedIn(false);
    }
  };

  const handleSyncLinkedInImportOnly = async () => {
    if (!linkedInEffectiveToken) {
      toast.error("Set the shared Apify token or a LinkedIn-specific token before import-only.");
      return;
    }
    setSyncingLinkedInImport(true);
    try {
      await runEdgeSync("sync-linkedin-apify", { import_only: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setSyncingLinkedInImport(false);
    }
  };

  const displayValue = (v: string) => (v.trim() ? v : "—");
  const formatSavedAt = (iso: string | null) =>
    iso ? format(new Date(iso), "MMM d, yyyy · HH:mm") : "—";

  const pipelineLabel = (p: string | null | undefined) => {
    if (p === "linkedin") return "LinkedIn";
    if (p === "naukri") return "Naukri";
    return "—";
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Apify private jobs | Admin</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Private jobs — Apify (Naukri &amp; LinkedIn)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure Naukri and LinkedIn scrapers separately. Jobs are stored in the same table with a source field.
            Use <strong>Run sync</strong> on each tab to pull from Apify.
          </p>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 flex gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p>
              Store Apify API tokens in the superadmin-only secrets table. Use the <strong>LinkedIn</strong> tab for a
              separate token and actor; the LinkedIn actor still needs saved search URLs (or a dataset ID) before you
              run a full sync.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="naukri" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-auto gap-1 p-1">
            <TabsTrigger value="listings" className="text-xs sm:text-sm">
              Job listings
            </TabsTrigger>
            <TabsTrigger value="naukri" className="text-xs sm:text-sm">
              Naukri
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="text-xs sm:text-sm">
              LinkedIn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Browse &amp; manage jobs</CardTitle>
                <CardDescription>
                  All rows in <code className="text-xs bg-muted px-1 rounded">naukri_jobs</code> (Naukri and
                  LinkedIn). Toggle <strong>Public</strong> to show or hide a job on{" "}
                  <strong>Apply latest jobs</strong>. Open the link icon to verify the employer URL before
                  deleting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminPrivateJobsListings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="naukri" className="space-y-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Naukri — saved configuration</CardTitle>
                <CardDescription>
                  Reflects the last save. Edit below and click <strong>Save configuration</strong>.
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
                                Not set
                              </>
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-border/60 pb-3">
                          <dt className="text-muted-foreground shrink-0 sm:w-40">Actor ID</dt>
                          <dd className="font-mono text-xs sm:text-sm break-all">
                            {displayValue(savedConfig.actorId)}
                          </dd>
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
                        onClick={handleSyncNaukri}
                        disabled={syncing || syncingNaukriImport || !canRunNaukriSync}
                      >
                        {syncing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Run sync now
                      </Button>
                      <Button
                        size="sm"
                        className="w-full"
                        variant="outline"
                        onClick={handleSyncNaukriImportOnly}
                        disabled={syncing || syncingNaukriImport || !canRunNaukriSync}
                      >
                        {syncingNaukriImport ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Import last dataset only
                      </Button>
                      {canRunNaukriSync && !loading ? (
                        <p className="text-xs text-muted-foreground text-center lg:text-left">
                          {savedConfig.datasetId.trim()
                            ? "Full run still starts the actor; import-only uses dataset override or last successful run."
                            : "Full sync starts a new run. Import-only skips a new run when a dataset exists."}
                        </p>
                      ) : !loading ? (
                        <p className="text-xs text-muted-foreground text-center lg:text-left">
                          Requires token + actor or dataset ID.
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Naukri — update configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? null : (
                  <>
                    <div className="space-y-2">
                      <Label>Apify API token</Label>
                      <p className="text-xs text-muted-foreground">
                        {savedConfig.hasToken
                          ? "Leave blank to keep current. This token is also the default for LinkedIn if you do not set a LinkedIn-only token."
                          : "Required for Naukri sync (and as LinkedIn fallback)."}
                      </p>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={savedConfig.hasToken ? "New token (optional)" : "apify_api_…"}
                        value={newToken}
                        onChange={(e) => setNewToken(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="naukri-actor">Actor ID</Label>
                      <Input
                        id="naukri-actor"
                        placeholder="e.g. codemaverick~naukri-job-scraper-latest"
                        value={editActorId}
                        onChange={(e) => setEditActorId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="naukri-dataset">Dataset ID (optional)</Label>
                      <Input
                        id="naukri-dataset"
                        placeholder="Fixed dataset instead of latest successful run"
                        value={editDatasetId}
                        onChange={(e) => setEditDatasetId(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSaveNaukri} disabled={saving || loading}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Naukri configuration
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="linkedin" className="space-y-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>LinkedIn — saved configuration</CardTitle>
                <CardDescription>
                  Same workflow as Naukri: save token and actor, add at least one LinkedIn jobs search URL, then{" "}
                  <strong>Run LinkedIn sync</strong>. Jobs appear on <strong>Apply latest jobs</strong> with a LinkedIn
                  badge (source filter).
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
                          <dt className="text-muted-foreground shrink-0 sm:w-44">Apify API token</dt>
                          <dd className="font-medium">
                            {savedLinkedIn.hasDedicatedToken ? (
                              <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                LinkedIn-specific (hidden)
                              </span>
                            ) : savedLinkedIn.hasSharedTokenFallback ? (
                              <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Using shared token from Naukri tab
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-destructive">
                                <XCircle className="h-4 w-4" />
                                Set shared or LinkedIn token
                              </span>
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-border/60 pb-3">
                          <dt className="text-muted-foreground shrink-0 sm:w-44">Actor ID</dt>
                          <dd className="font-mono text-xs sm:text-sm break-all">
                            {displayValue(
                              savedLinkedIn.actorId || "curious_coder~linkedin-jobs-scraper (default)",
                            )}
                          </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-border/60 pb-3">
                          <dt className="text-muted-foreground shrink-0 sm:w-44">Dataset ID (override)</dt>
                          <dd className="font-mono text-xs sm:text-sm break-all">
                            {displayValue(savedLinkedIn.datasetId)}
                          </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-4 border-b border-border/60 pb-3">
                          <dt className="text-muted-foreground shrink-0 sm:w-44">Search URLs saved</dt>
                          <dd>
                            {savedLinkedIn.searchUrlLineCount > 0
                              ? `${savedLinkedIn.searchUrlLineCount} https line(s)`
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-4">
                          <dt className="text-muted-foreground shrink-0 sm:w-44">Last updated</dt>
                          <dd className="text-muted-foreground">{formatSavedAt(savedLinkedIn.lastUpdatedAt)}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="lg:w-52 shrink-0 flex lg:flex-col justify-center lg:justify-center gap-3 lg:border-l lg:pl-8 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                      <Button
                        size="lg"
                        className="w-full"
                        variant="secondary"
                        onClick={handleSyncLinkedIn}
                        disabled={
                          syncingLinkedIn || syncingLinkedInImport || !linkedInCanRunSync
                        }
                      >
                        {syncingLinkedIn ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Run sync now
                      </Button>
                      <Button
                        size="sm"
                        className="w-full"
                        variant="outline"
                        onClick={handleSyncLinkedInImportOnly}
                        disabled={
                          syncingLinkedIn || syncingLinkedInImport || !linkedInCanImportOnly
                        }
                      >
                        {syncingLinkedInImport ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Import last LinkedIn dataset
                      </Button>
                      {!linkedInCanRunSync && !loading ? (
                        <p className="text-xs text-muted-foreground text-center lg:text-left">
                          Needs token + search URLs or dataset ID for a full run.
                        </p>
                      ) : linkedInEffectiveToken && !loading ? (
                        <p className="text-xs text-muted-foreground text-center lg:text-left">
                          {savedLinkedIn.datasetId.trim()
                            ? "Full run can start the actor; import-only uses dataset or last successful run."
                            : "Full sync uses saved URLs. Import-only needs a prior successful run."}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>LinkedIn — update configuration</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure the LinkedIn Apify actor separately from Naukri. Default actor:{" "}
                  <code className="text-xs bg-muted px-1 rounded">curious_coder~linkedin-jobs-scraper</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? null : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="li-token">Apify API token</Label>
                      <p className="text-xs text-muted-foreground">
                        {savedLinkedIn.hasDedicatedToken
                          ? "Leave blank to keep current. If empty on first setup, the Naukri tab token is used as fallback."
                          : "Enter your Apify API token for LinkedIn runs (or save the Naukri token first to reuse it)."}
                      </p>
                      <Input
                        id="li-token"
                        type="password"
                        autoComplete="new-password"
                        placeholder={
                          savedLinkedIn.hasDedicatedToken || savedLinkedIn.hasSharedTokenFallback
                            ? "New token (optional)"
                            : "apify_api_…"
                        }
                        value={editLinkedInToken}
                        onChange={(e) => setEditLinkedInToken(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="li-actor">Actor ID</Label>
                      <Input
                        id="li-actor"
                        placeholder="e.g. curious_coder~linkedin-jobs-scraper"
                        value={editLinkedInActor}
                        onChange={(e) => setEditLinkedInActor(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="li-dataset">Dataset ID (optional)</Label>
                      <Input
                        id="li-dataset"
                        placeholder="Fixed dataset instead of latest successful run"
                        value={editLinkedInDataset}
                        onChange={(e) => setEditLinkedInDataset(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="li-urls">LinkedIn job search URLs</Label>
                      <p className="text-xs text-muted-foreground">
                        One <strong>https</strong> URL per line (copy from the LinkedIn jobs search page address bar).{" "}
                        Required for <strong>Run LinkedIn sync</strong> unless you set a Dataset ID above.
                      </p>
                      <Textarea
                        id="li-urls"
                        className="min-h-[120px] font-mono text-sm"
                        placeholder={"https://www.linkedin.com/jobs/search/?keywords=...\nhttps://..."}
                        value={editLinkedInUrls}
                        onChange={(e) => setEditLinkedInUrls(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSaveLinkedIn} disabled={savingLinkedIn || loading}>
                      {savingLinkedIn ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save LinkedIn configuration
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Recent sync runs</CardTitle>
            <CardDescription>Naukri and LinkedIn (last 40 executions)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upserted</TableHead>
                  <TableHead>Skipped</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No runs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.started_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">{pipelineLabel(log.pipeline)}</TableCell>
                      <TableCell>{log.status}</TableCell>
                      <TableCell>{log.items_upserted ?? "—"}</TableCell>
                      <TableCell>{log.items_skipped ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-destructive">
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
