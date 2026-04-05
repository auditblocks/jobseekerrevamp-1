import { Helmet } from "react-helmet-async";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Briefcase,
    Building2,
    Calendar,
    Loader2,
    ChevronRight,
    MapPin,
    AlertCircle,
    Info,
    Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow, isToday, parseISO } from "date-fns";
import { useChatListingContext } from "@/contexts/ChatListingContext";
import Navbar from "@/components/landing/Navbar";
import FooterSection from "@/components/landing/FooterSection";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { buildSmartTagsForDisplay, getGovtJobCategoryBadges } from "@/lib/govtJobCategory";
import { JobListPagination } from "@/components/JobListPagination";

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
const DEFAULT_PAGE_SIZE = 12;

interface GovtJob {
    id: string;
    organization: string;
    post_name: string;
    exam_name: string | null;
    application_end_date: string | null;
    mode_of_apply: string | null;
    visibility: string;
    status: string;
    slug: string;
    location: string;
    summary: string | null;
    tags: string[];
    source_key?: string | null;
    state_code?: string | null;
    created_at?: string | null;
}

function normalizeTagKey(t: string): string {
    return t.toLowerCase().trim().replace(/\s+/g, "-");
}

function matchesGovernmentJobCategoryTag(tags: string[] | null | undefined): boolean {
    if (!tags?.length) return false;
    return tags.some((t) => {
        const k = normalizeTagKey(t);
        return (
            k === "government-job" ||
            k === "government-jobs" ||
            k === "government" ||
            (t.toLowerCase().includes("government") && t.toLowerCase().includes("job"))
        );
    });
}

const GovtJobs = () => {
    const navigate = useNavigate();
    const { setListingContext } = useChatListingContext();
    const { user, profile, loading: authLoading } = useAuth();
    const [jobs, setJobs] = useState<GovtJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [stateFilter, setStateFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

    const isPaidUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("govt_jobs" as any)
                .select("id, organization, post_name, exam_name, application_end_date, mode_of_apply, visibility, status, slug, location, summary, tags, source_key, state_code, created_at")
                .eq("status", "active")
                .order("application_end_date", { ascending: true });

            if (error) throw error;
            setJobs((data as unknown as GovtJob[]) || []);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            toast.error("Failed to load jobs");
        } finally {
            setIsLoading(false);
        }
    };

    const stateFilterOptions = useMemo(() => {
        const codes = new Set<string>();
        jobs.forEach((j) => {
            if (j.state_code) codes.add(j.state_code);
        });
        return ["all", ...Array.from(codes).sort()];
    }, [jobs]);

    const filteredJobs = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return jobs.filter((job) => {
            const matchesSearch =
                !q ||
                job.organization.toLowerCase().includes(q) ||
                job.post_name.toLowerCase().includes(q) ||
                (job.exam_name && job.exam_name.toLowerCase().includes(q)) ||
                (job.source_key && job.source_key.toLowerCase().includes(q)) ||
                job.tags?.some((t) => t.toLowerCase().includes(q));

            const code = job.state_code || "IN";
            const matchesState = stateFilter === "all" || code === stateFilter;

            return matchesSearch && matchesState;
        });
    }, [jobs, searchQuery, stateFilter]);

    const totalFiltered = filteredJobs.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedJobs = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredJobs.slice(start, start + pageSize);
    }, [filteredJobs, safePage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, stateFilter, pageSize]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (isLoading) {
            setListingContext(null);
            return;
        }
        const origin = window.location.origin;
        const rs = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
        const re = Math.min(safePage * pageSize, totalFiltered);
        const govCategoryCount = filteredJobs.filter((j) => matchesGovernmentJobCategoryTag(j.tags)).length;
        const postedToday = filteredJobs.filter((j) => {
            if (!j.created_at) return false;
            try {
                return isToday(parseISO(j.created_at));
            } catch {
                return false;
            }
        });
        const lines: string[] = [
            "LISTING DATA FOR THIS PAGE",
            `Page: /government-jobs (Government job listings)`,
            `User filters: search="${searchQuery}" | state/region=${stateFilter}`,
            `FILTERED SET: ${totalFiltered} jobs match current filters (of ${jobs.length} active jobs loaded).`,
            `Pagination: page ${safePage} of ${totalPages}; on-screen positions ${rs}–${re}.`,
            `Jobs in FILTERED SET whose tags look like "government-job" / government category: ${govCategoryCount}`,
            "",
            "VISIBLE SCREEN LIST (card order — #1 is the first job listed on this page):",
        ];
        paginatedJobs.forEach((job, i) => {
            const path = `/government-jobs/${job.slug || job.id}`;
            const url = `${origin}${path}`;
            let createdIso = "unknown";
            if (job.created_at) {
                try {
                    createdIso = parseISO(job.created_at).toISOString();
                } catch {
                    createdIso = job.created_at;
                }
            }
            const tagStr = (job.tags || []).join(", ") || "none";
            lines.push(
                `${i + 1}. ${job.post_name} | ${job.organization} | exam: ${job.exam_name || "n/a"} | tags: [${tagStr}] | created: ${createdIso} | url: ${url}`,
            );
        });
        lines.push("");
        lines.push(`POSTED TODAY (created date = local today, within FILTERED SET): ${postedToday.length} job(s)`);
        const maxToday = 40;
        postedToday.slice(0, maxToday).forEach((job) => {
            const url = `${origin}/government-jobs/${job.slug || job.id}`;
            lines.push(`- [${job.post_name} — ${job.organization}](${url})`);
        });
        if (postedToday.length > maxToday) {
            lines.push(`- …and ${postedToday.length - maxToday} more posted today (use filters or pagination).`);
        }
        setListingContext(lines.join("\n"));
        return () => setListingContext(null);
    }, [
        isLoading,
        setListingContext,
        searchQuery,
        stateFilter,
        totalFiltered,
        jobs.length,
        safePage,
        totalPages,
        pageSize,
        paginatedJobs,
        filteredJobs,
    ]);

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

    const rangeStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const rangeEnd = Math.min(safePage * pageSize, totalFiltered);

    const handleJobClick = (job: GovtJob) => {
        navigate(`/government-jobs/${job.slug || job.id}`);
    };

    const content = (
        <main className={`flex-1 container mx-auto px-4 py-8 ${user ? 'max-w-7xl' : ''}`}>
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                        Latest Government Jobs in India
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Stay ahead of your career with the latest notifications, application deadlines, and exam dates for all central and state government jobs.
                    </p>
                </div>

                {/* Search + region */}
                <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto items-stretch md:items-center justify-center">
                    <div className="relative flex-1 max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by organization, post, exam, tag, or source..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-14 text-lg rounded-2xl shadow-sm border-border/50 focus:border-accent"
                        />
                    </div>
                    {stateFilterOptions.length > 1 && (
                        <Select value={stateFilter} onValueChange={setStateFilter}>
                            <SelectTrigger className="h-14 w-full md:w-[200px] rounded-2xl">
                                <SelectValue placeholder="Region" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All regions</SelectItem>
                                {stateFilterOptions
                                    .filter((o) => o !== "all")
                                    .map((code) => (
                                        <SelectItem key={code} value={code}>
                                            {code === "IN" ? "National (IN)" : code}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {!isLoading && totalFiltered > 0 && (
                    <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
                        <p className="text-sm text-muted-foreground text-center sm:text-left">
                            <span className="font-semibold text-foreground">{totalFiltered}</span>
                            {jobs.length !== totalFiltered ? (
                                <>
                                    {" "}
                                    of {jobs.length} listing{jobs.length === 1 ? "" : "s"} match
                                </>
                            ) : (
                                <> listing{totalFiltered === 1 ? "" : "s"}</>
                            )}
                            <span className="mx-1.5 text-border hidden sm:inline">·</span>
                            <span className="block sm:inline text-xs sm:text-sm mt-1 sm:mt-0">
                                Page {safePage} of {totalPages} · Showing {rangeStart}–{rangeEnd}
                            </span>
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Per page</span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => setPageSize(Number(v))}
                            >
                                <SelectTrigger className="h-9 w-[5.5rem] rounded-xl bg-background border-border/60">
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
                )}

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-accent" />
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-24 border rounded-3xl bg-card/50 border-dashed">
                        <Briefcase className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                        <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                        <p className="text-muted-foreground">Try adjusting your search criteria or browse different categories.</p>
                    </div>
                ) : (
                    <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedJobs.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index * 0.04, 0.3) }}
                            >
                                <Card
                                    className="h-full hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 border-border/50 hover:border-accent/30 flex flex-col group cursor-pointer"
                                    onClick={() => handleJobClick(job)}
                                >
                                    <CardContent className="p-6 flex flex-col h-full space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {(() => {
                                                    const { primary, secondary } = getGovtJobCategoryBadges(job);
                                                    return (
                                                        <>
                                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest py-1">
                                                                {primary}
                                                            </Badge>
                                                            {secondary && (
                                                                <Badge variant="secondary" className="text-[9px] uppercase py-0.5">
                                                                    {secondary}
                                                                </Badge>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {job.visibility === 'premium' ? (
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info className="h-4 w-4 text-accent cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs text-xs">Sign up and subscribe to Apply the job</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Badge variant="accent" className="text-[10px] uppercase font-bold px-2">
                                                            Premium
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 bg-success/10 text-success border-success/20">
                                                        Free
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-accent transition-colors">
                                                {job.post_name}
                                            </h3>
                                            {job.summary && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {job.summary}
                                                </p>
                                            )}
                                            {(() => {
                                                const displayTags = buildSmartTagsForDisplay(job);
                                                if (displayTags.length === 0) return null;
                                                return (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {displayTags.slice(0, 4).map((tag, i) => (
                                                            <span key={i} className="text-[10px] bg-accent/5 text-accent/80 px-2 py-0.5 rounded-full border border-accent/10">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {displayTags.length > 4 && (
                                                            <span className="text-[10px] text-muted-foreground pt-0.5">+{displayTags.length - 4}</span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-border/50">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-4 w-4 text-accent/70" />
                                                <span className="truncate">{job.location || 'India'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4 text-accent/70" />
                                                <span>Due: {job.application_end_date ? format(new Date(job.application_end_date), 'MMM dd, yyyy') : 'N/A'}</span>
                                            </div>
                                            {job.created_at && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5 text-accent/60 shrink-0" />
                                                    <span>
                                                        Listed {format(new Date(job.created_at), "MMM d, yyyy")} ·{" "}
                                                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <Button
                                                variant="outline"
                                                className="w-full bg-accent/5 hover:bg-accent hover:text-white transition-all duration-300 font-bold"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!user) {
                                                        navigate("/auth?mode=signup&redirect=" + encodeURIComponent(`/govt-jobs/exam/${job.id}`));
                                                    } else {
                                                        navigate(`/govt-jobs/exam/${job.id}`);
                                                    }
                                                }}
                                            >
                                                Practice Test
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="w-full bg-muted/50 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300 font-bold"
                                            >
                                                {!user ? "Sign Up" : "View Details"}
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <JobListPagination
                        safePage={safePage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        className="border-border/50 pt-8 max-w-4xl mx-auto"
                        ariaLabel="Government jobs list pagination"
                    />
                    </>
                )}

                {/* SEO Content Block */}
                <div className="pt-20 border-t border-border/50">
                    <div className="prose prose-invert max-w-4xl mx-auto text-muted-foreground space-y-6">
                        <h2 className="text-2xl font-bold text-foreground">Find Your Dream Career in the Government Sector</h2>
                        <p>
                            Welcome to India's most comprehensive government jobs portal. Our platform is designed to provide you with real-time updates on all central and state government job opportunities. From UPSC Civil Services to SSC CGL, Banking (IBPS/SBI), Railways (RRB), and Defence sectors, we track every notification to ensure you never miss an application deadline.
                        </p>
                        <div className="grid md:grid-cols-2 gap-8 not-prose">
                            <div className="space-y-3 p-6 rounded-2xl bg-card/30 border border-border/50">
                                <h3 className="text-lg font-bold text-foreground">Why Track Govt Jobs with Us?</h3>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2 italic">
                                        <AlertCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                                        Verified notifications from official departmental sources.
                                    </li>
                                    <li className="flex items-start gap-2 italic">
                                        <AlertCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                                        Integrated job tracker to manage your application life-cycle.
                                    </li>
                                    <li className="flex items-start gap-2 italic">
                                        <AlertCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                                        AI-powered resume optimization for technical and administrative roles.
                                    </li>
                                </ul>
                            </div>
                            <div className="space-y-3 p-6 rounded-2xl bg-card/30 border border-border/50">
                                <h3 className="text-lg font-bold text-foreground">Prepare for Success</h3>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2 italic">
                                        <AlertCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                                        Detailed selection process descriptions for every job.
                                    </li>
                                    <li className="flex items-start gap-2 italic">
                                        <AlertCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                                        Direct links to official PDF notifications and application portals.
                                    </li>
                                    <li className="flex items-start gap-2 italic">
                                        <AlertCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                                        Curated list of premium jobs for professional and specialized roles.
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-sm italic">
                            Last updated: January 2026. Data sourced from official government gazettes and departmental websites. We recommend verification on official portals before finalizing applications.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );

    return (
        <>
            <Helmet>
                <title>Latest Government Jobs 2026 | Application Dates & Notifications | JobSeeker</title>
                <meta name="description" content="Browse the latest government job notifications, application dates, and eligibility criteria. Stay updated with upcoming govt exams and careers in central and state departments." />
                <link rel="canonical" href="https://startworking.in/government-jobs" />
            </Helmet>

            <div className="min-h-screen bg-background flex flex-col">
                {authLoading ? (
                    <div className="flex items-center justify-center flex-1">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                ) : user ? (
                    <DashboardLayout>
                        {content}
                    </DashboardLayout>
                ) : (
                    <>
                        <Navbar />
                        {content}
                        <FooterSection />
                    </>
                )}
            </div>
        </>
    );
};

export default GovtJobs;
