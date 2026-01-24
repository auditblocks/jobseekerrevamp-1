import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
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
    AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import Navbar from "@/components/landing/Navbar";
import FooterSection from "@/components/landing/FooterSection";

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
}

const GovtJobs = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [jobs, setJobs] = useState<GovtJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const isPaidUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("govt_jobs" as any)
                .select("id, organization, post_name, exam_name, application_end_date, mode_of_apply, visibility, status, slug, location, summary, tags")
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

    const filteredJobs = jobs.filter(job =>
        job.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.post_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.exam_name && job.exam_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <>
            <Helmet>
                <title>Latest Government Jobs 2026 | Application Dates & Notifications | JobSeeker</title>
                <meta name="description" content="Browse the latest government job notifications, application dates, and eligibility criteria. Stay updated with upcoming govt exams and careers in central and state departments." />
                <link rel="canonical" href="https://startworking.in/government-jobs" />
            </Helmet>

            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />

                <main className="flex-1 container mx-auto px-4 py-8">
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

                        {/* Search Bar */}
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search by organization, post, or exam name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 h-14 text-lg rounded-2xl shadow-sm border-border/50 focus:border-accent"
                            />
                        </div>

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
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredJobs.map((job, index) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card
                                            className="h-full hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 border-border/50 hover:border-accent/30 flex flex-col group cursor-pointer"
                                            onClick={() => navigate(`/government-jobs/${job.slug || job.id}`)}
                                        >
                                            <CardContent className="p-6 flex flex-col h-full space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest py-1">
                                                        {job.organization}
                                                    </Badge>
                                                    {job.visibility === 'premium' ? (
                                                        <Badge variant="accent" className="text-[10px] uppercase font-bold px-2">
                                                            Premium
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 bg-success/10 text-success border-success/20">
                                                            Free
                                                        </Badge>
                                                    )}
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
                                                    {job.tags && job.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {job.tags.slice(0, 3).map((tag, i) => (
                                                                <span key={i} className="text-[10px] bg-accent/5 text-accent/80 px-2 py-0.5 rounded-full border border-accent/10">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                            {job.tags.length > 3 && (
                                                                <span className="text-[10px] text-muted-foreground pt-0.5">+{job.tags.length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-3 pt-4">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-4 w-4 text-accent/70" />
                                                        <span className="truncate">{job.location || 'India'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-4 w-4 text-accent/70" />
                                                        <span>Due: {job.application_end_date ? format(new Date(job.application_end_date), 'MMM dd, yyyy') : 'N/A'}</span>
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="secondary"
                                                    className="w-full mt-4 bg-muted/50 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300"
                                                >
                                                    View Details
                                                    <ChevronRight className="h-4 w-4 ml-2" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
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

                <FooterSection />
            </div>
        </>
    );
};

export default GovtJobs;
