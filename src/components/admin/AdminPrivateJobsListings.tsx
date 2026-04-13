/**
 * @fileoverview Admin table for managing private (Naukri / LinkedIn) job listings.
 * Supports search, source/status filters, pagination, toggling public visibility,
 * and deleting individual jobs. Data is fetched directly from the `naukri_jobs` table.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { JobListPagination } from "@/components/JobListPagination";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ExternalLink, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PAGE_SIZE_OPTIONS = [15, 25, 50] as const;

export interface AdminNaukriJobRow {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  apply_url: string;
  source: string;
  is_active: boolean;
  scraped_at: string | null;
}

/** Returns a colour-coded badge for the job's scraping source. */
function sourceBadge(source: string) {
  if (source === "linkedin") {
    return (
      <Badge variant="outline" className="font-normal border-sky-500/40 text-sky-800 dark:text-sky-200">
        LinkedIn
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal border-teal-500/40 text-teal-800 dark:text-teal-200">
      Naukri
    </Badge>
  );
}

/**
 * Paginated admin listing of scraped private jobs with search, filter, visibility toggle,
 * and delete actions. Resets to page 1 when filters change and auto-corrects page overflow.
 */
export function AdminPrivateJobsListings() {
  const [jobs, setJobs] = useState<AdminNaukriJobRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "naukri" | "linkedin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminNaukriJobRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, sourceFilter, statusFilter]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("naukri_jobs" as never)
        .select(
          "id, title, company_name, location, apply_url, source, is_active, scraped_at",
          { count: "exact" },
        )
        .order("scraped_at", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }
      if (statusFilter === "active") {
        query = query.eq("is_active", true);
      } else if (statusFilter === "inactive") {
        query = query.eq("is_active", false);
      }

      // Escape SQL wildcards in the user's search input before using ilike
      if (debouncedSearch) {
        const raw = debouncedSearch.replace(/,/g, " ").trim();
        const escaped = raw.replace(/%/g, "\\%").replace(/_/g, "\\_");
        const pattern = `%${escaped}%`;
        query = query.or(`title.ilike.${pattern},company_name.ilike.${pattern},location.ilike.${pattern}`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setJobs((data as unknown as AdminNaukriJobRow[]) || []);
      setTotalCount(count ?? 0);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load private jobs");
      setJobs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sourceFilter, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // After a delete, the current page might exceed total pages — auto-correct
  useEffect(() => {
    if (loading) return;
    if (jobs.length === 0 && totalCount > 0) {
      const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
      if (page > lastPage) setPage(lastPage);
    }
  }, [loading, jobs.length, totalCount, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const showingFrom = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(safePage * pageSize, totalCount);

  const handleActiveChange = async (row: AdminNaukriJobRow, next: boolean) => {
    setToggleBusyId(row.id);
    try {
      const { error } = await supabase
        .from("naukri_jobs" as never)
        .update({ is_active: next } as never)
        .eq("id", row.id);
      if (error) throw error;
      setJobs((prev) => prev.map((j) => (j.id === row.id ? { ...j, is_active: next } : j)));
      toast.success(next ? "Job is visible on Apply latest jobs" : "Job hidden from public listing");
    } catch (e) {
      console.error(e);
      toast.error("Could not update job");
    } finally {
      setToggleBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase.from("naukri_jobs" as never).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Job removed");
      setDeleteTarget(null);
      await fetchJobs();
    } catch (e) {
      console.error(e);
      toast.error("Could not delete job");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription className="line-clamp-3">
              {deleteTarget?.title}
              {deleteTarget?.company_name ? ` · ${deleteTarget.company_name}` : ""}
              <br />
              This cannot be undone. The listing will disappear from the admin list and the public page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => confirmDelete()}
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-10 rounded-xl"
            placeholder="Search title, company, location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Source</p>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
              <SelectTrigger className="h-10 w-[140px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="naukri">Naukri</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Visibility</p>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-10 w-[160px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Public (active)</SelectItem>
                <SelectItem value="inactive">Hidden (inactive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Per page</p>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v) as (typeof PAGE_SIZE_OPTIONS)[number])}
            >
              <SelectTrigger className="h-10 w-[88px] rounded-xl">
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> job
          {totalCount === 1 ? "" : "s"}
          {debouncedSearch || sourceFilter !== "all" || statusFilter !== "all" ? " match filters" : " total"}
        </p>
        {totalCount > 0 ? (
          <p className="text-xs">
            Showing {showingFrom}–{showingTo}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading jobs…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground px-4">
            No jobs found. Adjust filters or run an Apify sync.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Job</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-center w-[100px]">Public</TableHead>
                <TableHead className="hidden sm:table-cell whitespace-nowrap">Scraped</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="space-y-1 max-w-md">
                      <p className="font-medium leading-snug line-clamp-2">{row.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {row.company_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground md:hidden">{row.location ?? "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[160px] truncate">
                    {row.location ?? "—"}
                  </TableCell>
                  <TableCell>{sourceBadge(row.source ?? "naukri")}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={row.is_active}
                        disabled={toggleBusyId === row.id}
                        onCheckedChange={(v) => handleActiveChange(row, v)}
                        aria-label={row.is_active ? "Visible on site" : "Hidden from site"}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {row.scraped_at ? format(new Date(row.scraped_at), "MMM d, yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                        <a href={row.apply_url} target="_blank" rel="noopener noreferrer" title="Open apply URL">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        title="Delete job"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {!loading && totalPages > 1 ? (
        <JobListPagination
          safePage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel="Private jobs admin pagination"
        />
      ) : null}
    </div>
  );
}
