/**
 * @file ApplyLatestJobs.tsx
 * @description Aggregated private-sector job listing page sourcing from Naukri and LinkedIn
 * (synced via Apify). Server-side filtering and pagination via the
 * `get_apply_latest_jobs_page` RPC. Authenticated users can "Apply" which records
 * a row in private_job_applies and opens the employer's listing in a new tab.
 * Daily apply limits are enforced per tier (privateApplyPolicy).
 * Guests can browse but must sign up to apply.
 * Supplies listing context to ChatListingContext for the AI assistant.
 */

import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import Navbar from "@/components/landing/Navbar";
import FooterSection from "@/components/landing/FooterSection";
import { JobListPagination } from "@/components/JobListPagination";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Search,
  Loader2,
  ExternalLink,
  Building2,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  X,
  FileText,
  CheckCircle2,
  ArrowUpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useChatListingContext } from "@/contexts/ChatListingContext";
import { toast } from "sonner";
import {
  PrivateApplySlots,
  isUnlimitedApply,
  fetchPrivateApplySlots,
  fetchAppliedJobIds,
} from "@/lib/privateApplyPolicy";

interface NaukriJobRow {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  apply_url: string;
  posted_at: string | null;
  summary: string | null;
  salary_text: string | null;
  experience_text: string | null;
  scraped_at: string | null;
  /** Omitted on list rows; loaded when opening the detail dialog. */
  raw_item?: Record<string, unknown> | null;
  skills: unknown;
  source: string;
}

const RAW_DESC_KEYS = [
  "Description",
  "Job Description",
  "job description",
  "Full Description",
  "Role Description",
  "description",
  "snippet",
  "summary",
  "jobDescription",
  "jobDescriptionText",
  "about",
  "job_details",
] as const;

/** Tries well-known keys in the raw_item JSON to extract a job description string. */
function pickDescriptionFromObject(o: Record<string, unknown>): string | null {
  for (const k of RAW_DESC_KEYS) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const job = o.job;
  if (job && typeof job === "object") {
    const d = (job as Record<string, unknown>).description;
    if (typeof d === "string" && d.trim()) return d.trim();
  }
  const listing = o.listing;
  if (listing && typeof listing === "object") {
    const d = (listing as Record<string, unknown>).description;
    if (typeof d === "string" && d.trim()) return d.trim();
  }
  for (const key of Object.keys(o)) {
    if (!/(description|snippet|about|details|profile)/i.test(key)) continue;
    const v = o[key];
    if (typeof v === "string" && v.trim().length > 15) return v.trim();
  }
  return null;
}

/** Full JD: DB summary first, then any description-like field in synced raw_item. */
function getFullJobDescription(job: NaukriJobRow): string | null {
  const fromSummary = job.summary?.trim();
  if (fromSummary) return fromSummary;
  const raw = job.raw_item;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return pickDescriptionFromObject(raw as Record<string, unknown>);
  }
  return null;
}

/** Normalizes skills field (array | CSV string | null) into a clean string array. */
function formatSkillsList(skills: unknown): string[] {
  if (Array.isArray(skills)) {
    return skills.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof skills === "string") {
    return skills
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

type ExperienceFilter = "all" | "entry" | "mid" | "senior" | "lead";
type SalaryFilter = "all" | "listed" | "unlisted";
type RecencyFilter = "all" | "week" | "month";
type SortKey = "scraped_desc" | "posted_desc" | "title_asc";
type SourceFilter = "all" | "naukri" | "linkedin";

function jobSource(job: NaukriJobRow): "naukri" | "linkedin" {
  return job.source === "linkedin" ? "linkedin" : "naukri";
}

function sourceBadgeVariant(source: "naukri" | "linkedin"): { label: string; className: string } {
  if (source === "linkedin") {
    return {
      label: "LinkedIn",
      className:
        "rounded-md border-0 bg-sky-600/15 px-2 py-0.5 text-xs font-medium text-sky-900 hover:bg-sky-600/20 dark:text-sky-100",
    };
  }
  return {
    label: "Naukri",
    className:
      "rounded-md border-0 bg-teal-600/15 px-2 py-0.5 text-xs font-medium text-teal-900 hover:bg-teal-600/20 dark:text-teal-100",
  };
}

function isRemoteOrHybrid(job: NaukriJobRow): boolean {
  const desc = getFullJobDescription(job) ?? "";
  const blob = `${job.title} ${job.location ?? ""} ${desc}`.toLowerCase();
  return /\b(remote|wfh|work from home|hybrid|work-from-home)\b/.test(blob);
}

const EXPERIENCE_LABELS: Record<Exclude<ExperienceFilter, "all">, string> = {
  entry: "Entry (0–2 yrs)",
  mid: "Mid (2–5 yrs)",
  senior: "Senior (5–10 yrs)",
  lead: "Lead (10+ yrs)",
};

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
const DEFAULT_PAGE_SIZE = 12;

const APPLY_LATEST_JOBS_PATH = "/apply-latest-jobs";

type ApplyLatestJobsPagePayload = {
  total: number;
  items: NaukriJobRow[];
  posted_today_count: number;
  posted_today_sample: { title: string; company_name: string | null; apply_url: string }[];
};

/** Type-safe parser for the JSON returned by the get_apply_latest_jobs_page RPC. */
function parseApplyPagePayload(raw: unknown): ApplyLatestJobsPagePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const total = Number(o.total);
  if (!Number.isFinite(total)) return null;
  const items = Array.isArray(o.items) ? (o.items as NaukriJobRow[]) : [];
  const postedTodayCount = Number(o.posted_today_count);
  const sample = Array.isArray(o.posted_today_sample) ? o.posted_today_sample : [];
  return {
    total,
    items,
    posted_today_count: Number.isFinite(postedTodayCount) ? postedTodayCount : 0,
    posted_today_sample: sample as ApplyLatestJobsPagePayload["posted_today_sample"],
  };
}

/**
 * Apply Latest Jobs page — server-paginated listing with rich filters, detail dialog,
 * daily apply limit enforcement, and an upgrade popup when limit is reached.
 */
const ApplyLatestJobs = () => {
  const navigate = useNavigate();
  const { setListingContext } = useChatListingContext();
  const { user, loading: authLoading } = useAuth();
  const signUpApplyHref = `/auth?mode=signup&redirect=${encodeURIComponent(APPLY_LATEST_JOBS_PATH)}`;
  const signInApplyHref = `/auth?redirect=${encodeURIComponent(APPLY_LATEST_JOBS_PATH)}`;
  const [pageJobs, setPageJobs] = useState<NaukriJobRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [postedTodayCount, setPostedTodayCount] = useState(0);
  const [postedTodaySample, setPostedTodaySample] = useState<
    ApplyLatestJobsPagePayload["posted_today_sample"]
  >([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchForFetch, setSearchForFetch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("scraped_desc");
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>("all");
  const [salaryFilter, setSalaryFilter] = useState<SalaryFilter>("all");
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [detailJob, setDetailJob] = useState<NaukriJobRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [detailRawLoading, setDetailRawLoading] = useState(false);
  const [applySlots, setApplySlots] = useState<PrivateApplySlots | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const filtersDigest = useMemo(
    () =>
      [
        searchForFetch,
        sortBy,
        experienceFilter,
        salaryFilter,
        recencyFilter,
        locationFilter,
        remoteOnly,
        sourceFilter,
      ].join("\u001f"),
    [
      searchForFetch,
      sortBy,
      experienceFilter,
      salaryFilter,
      recencyFilter,
      locationFilter,
      remoteOnly,
      sourceFilter,
    ],
  );
  const prevFiltersDigestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [slots, applied] = await Promise.all([
        fetchPrivateApplySlots(),
        fetchAppliedJobIds(user.id),
      ]);
      if (cancelled) return;
      setApplySlots(slots);
      setAppliedJobIds(applied);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => setSearchForFetch(searchQuery.trim()), 320);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocationsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_naukri_jobs_location_facets");
        if (cancelled) return;
        if (error) throw error;
        const list = (data ?? []) as unknown;
        setLocationOptions(
          Array.isArray(list)
            ? list.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            : [],
        );
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error("Could not load location filters");
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const prev = prevFiltersDigestRef.current;
    const digestChanged = prev !== null && prev !== filtersDigest;

    if (digestChanged) {
      prevFiltersDigestRef.current = filtersDigest;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    } else if (prev === null) {
      prevFiltersDigestRef.current = filtersDigest;
    }

    (async () => {
      setLoading(true);
      try {
        const offset = Math.max(0, (currentPage - 1) * pageSize);
        const { data, error } = await supabase.rpc("get_apply_latest_jobs_page", {
          p_search: searchForFetch,
          p_source: sourceFilter,
          p_location: locationFilter,
          p_salary: salaryFilter,
          p_recency: recencyFilter,
          p_experience: experienceFilter,
          p_remote_only: remoteOnly,
          p_sort: sortBy,
          p_limit: pageSize,
          p_offset: offset,
        });
        if (cancelled) return;
        if (error) throw error;
        const parsed = parseApplyPagePayload(data as unknown);
        if (!parsed) throw new Error("Invalid list payload");
        const normalized = parsed.items.map((j) => ({
          ...j,
          source: j.source ?? "naukri",
        }));
        setPageJobs(normalized);
        setTotalCount(parsed.total);
        setPostedTodayCount(parsed.posted_today_count);
        setPostedTodaySample(parsed.posted_today_sample);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error("Could not load jobs");
          setPageJobs([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtersDigest, pageSize, currentPage]);

  const totalFiltered = totalCount;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedJobs = pageJobs;

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const skipPaginationScrollRef = useRef(true);
  useEffect(() => {
    if (skipPaginationScrollRef.current) {
      skipPaginationScrollRef.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    const id = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [currentPage]);

  const filtersActive =
    Boolean(searchForFetch) ||
    experienceFilter !== "all" ||
    salaryFilter !== "all" ||
    recencyFilter !== "all" ||
    locationFilter !== "all" ||
    remoteOnly ||
    sourceFilter !== "all" ||
    sortBy !== "scraped_desc";

  const clearFilters = () => {
    setSearchQuery("");
    setSearchForFetch("");
    setExperienceFilter("all");
    setSalaryFilter("all");
    setRecencyFilter("all");
    setLocationFilter("all");
    setRemoteOnly(false);
    setSourceFilter("all");
    setSortBy("scraped_desc");
    setCurrentPage(1);
  };

  const rangeStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalFiltered);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) {
      setListingContext(null);
      return;
    }
    const lines: string[] = [
      "LISTING DATA FOR THIS PAGE",
      `Page: /apply-latest-jobs (aggregated listings; Apply uses the employer’s site)`,
      `Filters: search="${searchForFetch}", sort=${sortBy}, experience=${experienceFilter}, salary=${salaryFilter}, recency=${recencyFilter}, location=${locationFilter}, remoteOnly=${remoteOnly}, source=${sourceFilter}`,
      `FILTERED SET (server-side): ${totalFiltered} job(s) match current filters. Page ${safePage} of ${totalPages}; rows ${rangeStart}–${rangeEnd} (this page only in list below).`,
      "",
      "VISIBLE SCREEN LIST (card order — #1 is the first job listed on this page):",
    ];
    paginatedJobs.forEach((job, i) => {
      const posted =
        (job.posted_at ?? job.scraped_at) ||
        "unknown";
      lines.push(
        `${i + 1}. ${job.title} | ${job.company_name || "n/a"} | ${job.location || "n/a"} | posted/scraped: ${posted} | apply_url: ${job.apply_url}`,
      );
    });
    lines.push("");
    lines.push(
      `POSTED TODAY (Asia/Kolkata date on coalesce(posted_at, scraped_at), within FILTERED SET): ${postedTodayCount} job(s)`,
    );
    postedTodaySample.forEach((row) => {
      lines.push(`- [${row.title} — ${row.company_name || "Employer"}](${row.apply_url})`);
    });
    if (postedTodayCount > postedTodaySample.length) {
      lines.push(`- …and ${postedTodayCount - postedTodaySample.length} more posted today (sample capped).`);
    }
    setListingContext(lines.join("\n"));
    return () => setListingContext(null);
  }, [
    loading,
    setListingContext,
    searchForFetch,
    sortBy,
    experienceFilter,
    salaryFilter,
    recencyFilter,
    locationFilter,
    remoteOnly,
    sourceFilter,
    totalFiltered,
    safePage,
    totalPages,
    rangeStart,
    rangeEnd,
    paginatedJobs,
    postedTodayCount,
    postedTodaySample,
  ]);

  useEffect(() => {
    if (!detailJob?.id) return;
    if (detailJob.raw_item !== undefined) return;

    let cancelled = false;
    setDetailRawLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("naukri_jobs" as never)
          .select("raw_item")
          .eq("id", detailJob.id)
          .maybeSingle();
        if (cancelled || error) return;
        const raw =
          (data as { raw_item?: Record<string, unknown> | null } | null)?.raw_item ?? null;
        setDetailJob((prev) =>
          prev && prev.id === detailJob.id ? { ...prev, raw_item: raw } : prev,
        );
      } finally {
        if (!cancelled) setDetailRawLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailJob?.id, detailJob?.raw_item]);

  const initials = (name: string | null) => {
    if (!name?.trim()) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  /**
   * Records the apply action in private_job_applies (enforced by a DB trigger that checks
   * daily limits), then opens the employer's apply URL. Handles duplicate-apply (23505)
   * gracefully and shows upgrade popup when limit is exhausted.
   */
  const handleApply = async (job: NaukriJobRow) => {
    if (!user) return;
    if (appliedJobIds.has(job.id)) {
      window.open(job.apply_url, "_blank", "noopener,noreferrer");
      return;
    }
    setApplyingJobId(job.id);
    try {
      const { error } = await supabase
        .from("private_job_applies" as any)
        .insert({ user_id: user.id, naukri_job_id: job.id } as any);
      if (error) {
        if (error.code === "23505") {
          // duplicate — already applied, just open
          setAppliedJobIds((prev) => new Set(prev).add(job.id));
          window.open(job.apply_url, "_blank", "noopener,noreferrer");
          return;
        }
        if (error.message?.includes("Daily apply limit reached")) {
          setShowUpgradePopup(true);
          return;
        }
        throw error;
      }
      setAppliedJobIds((prev) => new Set(prev).add(job.id));
      setApplySlots((prev) =>
        prev && !isUnlimitedApply(prev)
          ? { ...prev, used_today: prev.used_today + 1, remaining: Math.max(0, prev.remaining - 1) }
          : prev,
      );
      window.open(job.apply_url, "_blank", "noopener,noreferrer");
      toast.success("Application tracked!");
    } catch (e: any) {
      console.error("Apply error:", e);
      toast.error(e.message || "Could not apply");
    } finally {
      setApplyingJobId(null);
    }
  };

  const pageBody = (
    <>
      <Helmet>
        <title>Apply latest jobs | JobSeeker</title>
        <meta
          name="description"
          content="Curated listings from Naukri and LinkedIn. Apply on the employer site."
        />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/25">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-teal-950/[0.04] via-background to-violet-950/[0.05] dark:from-teal-950/30 dark:via-background dark:to-violet-950/20">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
            aria-hidden
          />
          <div className="container relative mx-auto max-w-5xl px-4 py-10 sm:py-12">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-800 dark:text-teal-200">
                <Sparkles className="h-3.5 w-3.5" />
                Curated listings from Naukri and LinkedIn
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.25rem] leading-tight">
                Apply latest jobs
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base leading-relaxed">
                Curated listings from Naukri and LinkedIn job search, synced on a schedule. Open a
                card for the full description, then use Apply to go to the original posting.
              </p>
              {!user ? (
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                  Browsing is open to everyone.{" "}
                  <Link to={signUpApplyHref} className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                    Sign up
                  </Link>
                  {" "}or{" "}
                  <Link to={signInApplyHref} className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                    Sign in
                  </Link>
                  {" "}
                  to apply on the employer site.
                </p>
              ) : null}
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative mb-6"
          >
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, company, location, skills…"
              className="h-12 rounded-xl border-border/80 bg-card/80 pl-11 text-base shadow-sm backdrop-blur-sm focus-visible:ring-teal-500/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm backdrop-blur-sm sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Filters
              </div>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  Reset filters
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Source</label>
                <Select
                  value={sourceFilter}
                  onValueChange={(v) => setSourceFilter(v as SourceFilter)}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="naukri">Naukri only</SelectItem>
                    <SelectItem value="linkedin">LinkedIn only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sort by</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scraped_desc">Recently synced</SelectItem>
                    <SelectItem value="posted_desc">Recently posted</SelectItem>
                    <SelectItem value="title_asc">Title A → Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Experience</label>
                <Select
                  value={experienceFilter}
                  onValueChange={(v) => setExperienceFilter(v as ExperienceFilter)}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background/80">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any experience</SelectItem>
                    {(Object.keys(EXPERIENCE_LABELS) as Exclude<ExperienceFilter, "all">[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {EXPERIENCE_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Salary</label>
                <Select value={salaryFilter} onValueChange={(v) => setSalaryFilter(v as SalaryFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="listed">Salary mentioned</SelectItem>
                    <SelectItem value="unlisted">Salary not listed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Listed date</label>
                <Select value={recencyFilter} onValueChange={(v) => setRecencyFilter(v as RecencyFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background/80">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">All locations</SelectItem>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button
                  type="button"
                  variant={remoteOnly ? "default" : "outline"}
                  className={cn(
                    "h-10 w-full rounded-xl border-dashed transition-all",
                    remoteOnly &&
                      "border-teal-500/50 bg-teal-600 text-primary-foreground hover:bg-teal-700 dark:bg-teal-600",
                  )}
                  onClick={() => setRemoteOnly((v) => !v)}
                >
                  {remoteOnly ? "Showing remote / hybrid only" : "Remote / hybrid only"}
                </Button>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Tip: combine search with filters. Many Naukri rows have empty salary in the feed; choosing
              “Salary mentioned” hides them. Use <strong>Source</strong> to focus on Naukri or LinkedIn
              listings, or Reset filters to see everything again.
            </p>
          </motion.div>

          {/* Daily apply counter */}
          {user && applySlots && !isUnlimitedApply(applySlots) ? (
            <div className="mb-4 flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 px-3 py-1.5 text-sm font-medium",
                  applySlots.remaining > 0
                    ? "border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-200"
                    : "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200",
                )}
              >
                {applySlots.remaining > 0
                  ? `${applySlots.remaining} applies left today`
                  : "Daily apply limit reached"}
              </Badge>
              {applySlots.remaining <= 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 rounded-lg border-teal-500/40 text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
                  onClick={() => navigate("/dashboard/subscription")}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  Upgrade
                </Button>
              ) : null}
            </div>
          ) : null}

          {/* Results count */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{totalFiltered}</span>
                {" "}
                job{totalFiltered === 1 ? "" : "s"}
                {searchForFetch || filtersActive ? " match your filters" : ""}
              </p>
              {totalFiltered > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Page <span className="font-medium text-foreground">{safePage}</span> of{" "}
                  <span className="font-medium text-foreground">{totalPages}</span>
                  <span className="mx-1.5 text-border">·</span>
                  Showing {rangeStart}–{rangeEnd} of {totalFiltered}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {totalFiltered > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="h-9 w-[5.5rem] rounded-lg bg-background/80 text-xs">
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
              ) : null}
              {!loading && totalFiltered === 0 ? (
                <Badge variant="outline" className="font-normal">
                  Try broadening filters
                </Badge>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Loading opportunities…
              </p>
            </div>
          ) : totalFiltered === 0 ? (
            <Card className="overflow-hidden border-dashed border-2 border-border/60 bg-muted/20">
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  {!locationsLoading && totalFiltered === 0 && !searchForFetch && !filtersActive
                    ? "No jobs yet. Ask an admin to configure Apify and run a sync."
                    : "No jobs match your search or filters."}
                </p>
                {totalFiltered === 0 && (searchForFetch || filtersActive) ? (
                  <Button variant="link" className="mt-2" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {paginatedJobs.map((job, i) => {
                  const jdPreview = getFullJobDescription(job);
                  return (
                  <motion.article
                    layout
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(i * 0.02, 0.25), duration: 0.2 }}
                  >
                    <Card
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailJob(job)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailJob(job);
                        }
                      }}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden border-border/70 bg-card/90 shadow-md transition-all duration-300",
                        "hover:border-teal-500/35 hover:shadow-xl hover:shadow-teal-500/5",
                        "dark:hover:shadow-teal-900/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
                      )}
                    >
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-violet-500 opacity-90" />
                      <CardContent className="relative p-0">
                        <div className="flex flex-col gap-4 p-5 pl-6 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6">
                          <div className="flex min-w-0 gap-4">
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-violet-500/20 text-sm font-bold tracking-tight text-teal-900 dark:text-teal-100"
                              aria-hidden
                            >
                              {initials(job.company_name)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                                {job.title}
                              </h2>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                                {job.company_name ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                    {job.company_name}
                                  </span>
                                ) : null}
                                {job.location ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                    {job.location}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const sb = sourceBadgeVariant(jobSource(job));
                                  return (
                                    <Badge className={sb.className}>{sb.label}</Badge>
                                  );
                                })()}
                                {job.salary_text?.trim() ? (
                                  <Badge className="rounded-md border-0 bg-emerald-600/15 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-600/20 dark:text-emerald-200">
                                    {job.salary_text}
                                  </Badge>
                                ) : null}
                                {job.experience_text?.trim() ? (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-md px-2 py-0.5 text-xs font-normal"
                                  >
                                    {job.experience_text}
                                  </Badge>
                                ) : null}
                                {isRemoteOrHybrid(job) ? (
                                  <Badge
                                    variant="outline"
                                    className="rounded-md border-violet-500/30 px-2 py-0.5 text-xs text-violet-800 dark:text-violet-200"
                                  >
                                    Flexible
                                  </Badge>
                                ) : null}
                              </div>
                              {jdPreview ? (
                                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                  {jdPreview}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">
                                  Click to view details — full text may be on the source site.
                                </p>
                              )}
                              <p className="text-xs font-medium text-teal-700 dark:text-teal-300 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                View full description
                              </p>
                              <p className="text-xs text-muted-foreground/80">
                                {job.posted_at
                                  ? `Posted ${format(new Date(job.posted_at), "MMM d, yyyy")}`
                                  : job.scraped_at
                                    ? `Synced ${format(new Date(job.scraped_at), "MMM d, yyyy")}`
                                    : null}
                              </p>
                            </div>
                          </div>
                          <div
                            className="flex shrink-0 items-center sm:flex-col sm:justify-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 w-full rounded-xl sm:w-auto sm:min-w-[9rem]"
                              onClick={() => setDetailJob(job)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Details
                            </Button>
                            {user ? (
                              appliedJobIds.has(job.id) ? (
                                <Button
                                  type="button"
                                  className="h-11 w-full rounded-xl border-green-500/40 bg-green-500/10 px-6 font-semibold text-green-800 hover:bg-green-500/20 dark:text-green-200 sm:w-auto sm:min-w-[9rem]"
                                  variant="outline"
                                  onClick={() => window.open(job.apply_url, "_blank", "noopener,noreferrer")}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Applied
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  className="h-11 w-full rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 font-semibold shadow-lg transition-all hover:from-teal-700 hover:to-teal-800 hover:shadow-teal-500/20 dark:from-slate-100 dark:to-white dark:text-slate-900 dark:hover:from-teal-200 dark:hover:to-teal-100 sm:w-auto sm:min-w-[9rem]"
                                  disabled={applyingJobId === job.id}
                                  onClick={() => handleApply(job)}
                                >
                                  {applyingJobId === job.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                  )}
                                  Apply
                                </Button>
                              )
                            ) : (
                              <Button
                                type="button"
                                className="h-11 w-full rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 font-semibold shadow-lg transition-all hover:from-teal-700 hover:to-teal-800 sm:w-auto sm:min-w-[9rem] dark:from-slate-100 dark:to-white dark:text-slate-900 dark:hover:from-teal-200 dark:hover:to-teal-100"
                                onClick={() => navigate(signUpApplyHref)}
                              >
                                Sign up to apply
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.article>
                );
                })}
              </AnimatePresence>

              <JobListPagination
                safePage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                ariaLabel="Job list pagination"
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!detailJob} onOpenChange={(open) => !open && setDetailJob(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
          {detailJob ? (
            <>
              <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5 text-left">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-violet-500/20 text-sm font-bold text-teal-900 dark:text-teal-100"
                    aria-hidden
                  >
                    {initials(detailJob.company_name)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 pr-8">
                    <DialogTitle className="text-xl leading-snug sm:text-2xl">{detailJob.title}</DialogTitle>
                    <DialogDescription asChild>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {detailJob.company_name ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {detailJob.company_name}
                          </span>
                        ) : null}
                        {detailJob.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {detailJob.location}
                          </span>
                        ) : null}
                      </div>
                    </DialogDescription>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(() => {
                        const sb = sourceBadgeVariant(jobSource(detailJob));
                        return <Badge className={sb.className}>{sb.label}</Badge>;
                      })()}
                      {detailJob.salary_text?.trim() ? (
                        <Badge className="rounded-md border-0 bg-emerald-600/15 text-emerald-800 dark:text-emerald-200">
                          {detailJob.salary_text}
                        </Badge>
                      ) : null}
                      {detailJob.experience_text?.trim() ? (
                        <Badge variant="secondary" className="rounded-md font-normal">
                          {detailJob.experience_text}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[min(65vh,520px)] px-6 py-4">
                <div className="space-y-4 pr-4">
                  {formatSkillsList(detailJob.skills).length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {formatSkillsList(detailJob.skills).slice(0, 40).map((s) => (
                          <Badge key={s} variant="outline" className="font-normal">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Job description
                    </p>
                    {(() => {
                      if (detailRawLoading && !getFullJobDescription(detailJob)) {
                        return (
                          <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-label="Loading description" />
                          </div>
                        );
                      }
                      const jd = getFullJobDescription(detailJob);
                      if (jd) {
                        return (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {jd}
                          </div>
                        );
                      }
                      return (
                        <p className="text-sm text-muted-foreground">
                          We don&apos;t have the full job description in this sync. Open the original
                          listing for the complete JD and application steps.
                        </p>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {detailJob.posted_at
                      ? `Posted ${format(new Date(detailJob.posted_at), "MMM d, yyyy")}`
                      : detailJob.scraped_at
                        ? `Synced ${format(new Date(detailJob.scraped_at), "MMM d, yyyy")}`
                        : null}
                  </p>
                </div>
              </ScrollArea>
              <DialogFooter className="border-t border-border/60 bg-card px-6 py-4 flex-col gap-2 sm:flex-row sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setDetailJob(null)}>
                  Close
                </Button>
                {user ? (
                  appliedJobIds.has(detailJob.id) ? (
                    <Button
                      className="rounded-xl border-green-500/40 bg-green-500/10 text-green-800 hover:bg-green-500/20 dark:text-green-200"
                      variant="outline"
                      onClick={() => window.open(detailJob.apply_url, "_blank", "noopener,noreferrer")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Applied — {jobSource(detailJob) === "linkedin" ? "view on LinkedIn" : "view on Naukri"}
                    </Button>
                  ) : (
                    <Button
                      className="rounded-xl"
                      disabled={applyingJobId === detailJob.id}
                      onClick={() => handleApply(detailJob)}
                    >
                      {applyingJobId === detailJob.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      {jobSource(detailJob) === "linkedin" ? "Apply on LinkedIn" : "Apply on Naukri"}
                    </Button>
                  )
                ) : (
                  <Button className="rounded-xl" onClick={() => navigate(signUpApplyHref)}>
                    Sign up to apply
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Upgrade popup — secondary modal on top of everything */}
      <AlertDialog open={showUpgradePopup} onOpenChange={setShowUpgradePopup}>
        <AlertDialogContent className="sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-teal-600" />
              Daily apply limit reached
            </AlertDialogTitle>
            <AlertDialogDescription>
              {applySlots
                ? `You've used all ${applySlots.max} of your ${applySlots.tier} daily applies. Upgrade your plan for more applies — limits reset at midnight IST.`
                : "You've reached your daily apply limit. Upgrade your plan for more applies."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={() => navigate("/dashboard/subscription")}
            >
              Upgrade plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user) {
    return <DashboardLayout>{pageBody}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">{pageBody}</main>
      <FooterSection />
    </div>
  );
};

export default ApplyLatestJobs;
