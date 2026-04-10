import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, Search, Building2, Calendar, FileQuestion, RefreshCw, Clock, Save, Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

const AdminGovtJobs = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(15);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [scraping, setScraping] = useState(false);
    const [scrapeSource, setScrapeSource] = useState<string>("all");
    /** full = ingest many listings; quick = small batch + AI exam generation */
    const [scrapeMode, setScrapeMode] = useState<string>("full");

    const [freeMax, setFreeMax] = useState<number>(2);
    const [proMax, setProMax] = useState<number>(5);
    const [limitsLoading, setLimitsLoading] = useState(true);
    const [limitsSaving, setLimitsSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await supabase
                    .from("dashboard_config" as any)
                    .select("config_key, config_value")
                    .in("config_key", ["govt_practice_free_max", "govt_practice_pro_max"]);
                if (data) {
                    for (const row of data as any[]) {
                        const val = (row.config_value as any)?.max;
                        if (row.config_key === "govt_practice_free_max" && typeof val === "number") setFreeMax(val);
                        if (row.config_key === "govt_practice_pro_max" && typeof val === "number") setProMax(val);
                    }
                }
            } finally {
                setLimitsLoading(false);
            }
        })();
    }, []);

    const handleSaveLimits = async () => {
        setLimitsSaving(true);
        try {
            const upserts = [
                { config_key: "govt_practice_free_max", config_value: { max: freeMax }, display_order: 90, is_active: true },
                { config_key: "govt_practice_pro_max",  config_value: { max: proMax },  display_order: 91, is_active: true },
            ];
            for (const row of upserts) {
                const { error } = await supabase
                    .from("dashboard_config" as any)
                    .upsert(row as any, { onConflict: "config_key" });
                if (error) throw error;
            }
            toast.success("Practice tracker limits saved");
        } catch (err) {
            console.error("Error saving limits:", err);
            toast.error("Failed to save limits");
        } finally {
            setLimitsSaving(false);
        }
    };

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
        return () => clearTimeout(id);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, pageSize]);

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from("govt_jobs" as any)
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false })
                .range(from, to);

            if (debouncedSearch) {
                const raw = debouncedSearch.replace(/,/g, " ").trim();
                const escaped = raw.replace(/%/g, "\\%").replace(/_/g, "\\_");
                const pattern = `%${escaped}%`;
                query = query.or(`post_name.ilike.${pattern},organization.ilike.${pattern}`);
            }

            const { data, error, count } = await query;

            if (error) throw error;
            setJobs(data || []);
            setTotalCount(count ?? 0);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            toast.error("Failed to fetch govt. jobs");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    useEffect(() => {
        if (loading) return;
        if (jobs.length === 0 && totalCount > 0) {
            const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
            if (page > lastPage) setPage(lastPage);
        }
    }, [loading, jobs.length, totalCount, page, pageSize]);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this job posting?")) return;

        try {
            const { error } = await supabase.from("govt_jobs" as any).delete().eq("id", id);
            if (error) throw error;

            await fetchJobs();
            toast.success("Job deleted successfully");
        } catch (error) {
            console.error("Error deleting job:", error);
            toast.error("Failed to delete job");
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const showingTo = Math.min(page * pageSize, totalCount);

    const handleManualScrape = async () => {
        setScraping(true);
        try {
            const runBody =
                scrapeMode === "quick"
                    ? { limit: 10, generateExams: true, ...(scrapeSource !== "all" ? { source: scrapeSource } : {}) }
                    : {
                          limit: "all",
                          generateExams: false,
                          ...(scrapeSource !== "all" ? { source: scrapeSource } : {}),
                      };

            const { data, error } = await supabase.functions.invoke("scrape-govt-jobs", {
                body: runBody,
            });

            if (error) throw error;

            if (!data?.success) {
                throw new Error(data?.error || "Scraping failed");
            }

            const counters = data?.data?.counters;
            const limits = data?.data?.limits as { exam_generation?: boolean } | undefined;
            const sourcesRun = data?.data?.sources_run as { key: string }[] | undefined;
            const srcLabel = sourcesRun?.map((s) => s.key).join(", ") || "";
            toast.success(
                `Scrape complete${srcLabel ? ` [${srcLabel}]` : ""}: ${counters?.inserted || 0} inserted, ${counters?.updated || 0} updated, ${counters?.exam_generated || 0} exam sets.${limits?.exam_generation === false ? " (AI exams skipped for bulk run — use Quick mode for sample exams.)" : ""}`,
            );
            await fetchJobs();
        } catch (error: any) {
            console.error("Manual govt job scrape failed:", error);
            toast.error(error?.message || "Failed to run govt job scraper");
        } finally {
            setScraping(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Govt. Job Postings</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage government job alerts and portal content
                            {!loading && (
                                <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0 text-foreground font-medium">
                                    · {totalCount} job{totalCount !== 1 ? "s" : ""} total
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={scrapeSource} onValueChange={setScrapeSource} disabled={scraping}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All enabled sources</SelectItem>
                                <SelectItem value="upsc">UPSC (active exams)</SelectItem>
                                <SelectItem value="freejobalert">FreeJobAlert (govt listings)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={scrapeMode} onValueChange={setScrapeMode} disabled={scraping}>
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="full">Full ingest (bulk; skips AI exams)</SelectItem>
                                <SelectItem value="quick">Quick sample (10 jobs + AI exams)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleManualScrape}
                            disabled={scraping}
                        >
                            <RefreshCw className={`w-4 h-4 ${scraping ? "animate-spin" : ""}`} />
                            {scraping ? "Scraping..." : "Run scraper"}
                        </Button>
                        <Link to="/admin/govt-jobs/new">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Job
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Practice / Tracker Limits */}
                <Card className="border-border shadow-sm">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-sm mb-4">Practice / Tracker Limits</h3>
                        {limitsLoading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : (
                            <div className="flex flex-wrap items-end gap-6">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Free tier max tracker slots</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={freeMax}
                                        onChange={(e) => setFreeMax(Number(e.target.value))}
                                        className="w-24 h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Pro tier max tracker slots</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={proMax}
                                        onChange={(e) => setProMax(Number(e.target.value))}
                                        className="w-24 h-9"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    className="gap-1.5 h-9"
                                    onClick={handleSaveLimits}
                                    disabled={limitsSaving}
                                >
                                    {limitsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save
                                </Button>
                                <p className="text-[10px] text-muted-foreground max-w-xs">
                                    Pro Max users always have unlimited access. Changes apply immediately for new tracker adds.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="bg-white rounded-xl shadow-sm border border-border p-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search jobs or organizations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => setPageSize(Number(v))}
                                disabled={loading}
                            >
                                <SelectTrigger className="w-[88px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Job Title & Organization</TableHead>
                                    <TableHead>Source / Region</TableHead>
                                    <TableHead>Mode/Visibility</TableHead>
                                    <TableHead>Fee</TableHead>
                                    <TableHead>Deadlines</TableHead>
                                    <TableHead>Posted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : jobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No job postings found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    jobs.map((job) => (
                                        <TableRow key={job.id}>
                                            <TableCell className="max-w-[300px]">
                                                <div className="font-medium truncate">{job.post_name}</div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {job.organization}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-mono">{job.source_key || "—"}</div>
                                                <div className="text-muted-foreground">{job.state_code || "—"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit text-[10px] capitalize">
                                                        {job.mode_of_apply}
                                                    </Badge>
                                                    <Badge
                                                        variant={job.visibility === 'premium' ? 'accent' : 'secondary'}
                                                        className="w-fit text-[10px] uppercase"
                                                    >
                                                        {job.visibility}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {job.application_fee || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs space-y-1">
                                                    <p className="flex items-center gap-1">
                                                        <span className="text-muted-foreground w-12 italic">Starts:</span>
                                                        {job.application_start_date ? format(new Date(job.application_start_date), "MMM d") : "-"}
                                                    </p>
                                                    <p className="flex items-center gap-1 font-semibold">
                                                        <span className="text-muted-foreground w-12 italic font-normal">Ends:</span>
                                                        {job.application_end_date ? format(new Date(job.application_end_date), "MMM d, yyyy") : "-"}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {job.created_at ? (
                                                    <div className="flex items-start gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                        <span>
                                                            {format(new Date(job.created_at), "MMM d, yyyy")}
                                                            <br />
                                                            <span className="text-[10px] opacity-80">
                                                                {format(new Date(job.created_at), "h:mm a")}
                                                            </span>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link to={`/admin/govt-jobs/${job.id}/questions`}>
                                                        <Button variant="ghost" size="icon" title="Manage Exam Questions">
                                                            <FileQuestion className="w-4 h-4 text-primary" />
                                                        </Button>
                                                    </Link>
                                                    <Link to={`/admin/govt-jobs/${job.id}`}>
                                                        <Button variant="ghost" size="icon">
                                                            <Edit className="w-4 h-4 text-accent" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(job.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {!loading && totalCount > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-medium text-foreground">{showingFrom}</span>–
                                <span className="font-medium text-foreground">{showingTo}</span> of{" "}
                                <span className="font-medium text-foreground">{totalCount}</span>
                                {debouncedSearch ? ` (filtered)` : ""}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground px-2">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminGovtJobs;
