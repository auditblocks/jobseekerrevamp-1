import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Building2,
    Calendar,
    Globe,
    ExternalLink,
    Plus,
    Loader2,
    FileText,
    Info,
    CheckCircle2,
    MapPin,
    AlertCircle,
    UserCircle2,
    ShieldAlert
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
    advertisement_no: string | null;
    official_website: string | null;
    apply_url: string | null;
    application_start_date: string | null;
    application_end_date: string | null;
    application_fee: string | null;
    mode_of_apply: string | null;
    description: string | null;
    summary: string | null;
    visibility: string;
    slug: string;
    location: string;
    meta_title: string | null;
    meta_description: string | null;
    job_posting_json: any;
}

const GovtJobDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [job, setJob] = useState<GovtJob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingToTracker, setIsAddingToTracker] = useState(false);

    const isPaidUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";

    useEffect(() => {
        if (slug) fetchJobDetail();
    }, [slug]);

    const fetchJobDetail = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("govt_jobs" as any)
                .select("*")
                .or(`slug.eq.${slug},id.eq.${slug}`) // Support both slug and ID for transition
                .single();

            if (error) throw error;
            setJob(data as unknown as GovtJob);
        } catch (error) {
            console.error("Error fetching job detail:", error);
            toast.error("Failed to load job details");
            navigate("/government-jobs");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToTracker = async () => {
        if (!user) {
            toast.error("Please sign in to track jobs");
            navigate("/auth?mode=signup&redirect=" + encodeURIComponent(window.location.pathname));
            return;
        }

        if (!job) return;

        try {
            setIsAddingToTracker(true);
            const { error } = await supabase.from("job_tracker" as any).insert({
                user_id: user.id,
                job_id: job.id,
                organization: job.organization,
                post_name: job.post_name,
                exam_name: job.exam_name,
                advertisement_no: job.advertisement_no,
                official_website: job.official_website,
                application_start_date: job.application_start_date,
                application_end_date: job.application_end_date,
                application_fee: job.application_fee,
                mode_of_apply: job.mode_of_apply,
                application_status: "Not Applied"
            });

            if (error) throw error;
            toast.success("Added to your Job Tracker!");
        } catch (error) {
            console.error("Error adding to tracker:", error);
            toast.error("Failed to add to tracker");
        } finally {
            setIsAddingToTracker(false);
        }
    };

    const renderApplyButton = () => {
        if (!job) return null;

        const isPremium = job.visibility === 'premium';

        // Guest Flow
        if (!user) {
            return (
                <div className="flex flex-col gap-3">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    className="w-full gap-2 h-12 text-md font-bold"
                                    variant="hero"
                                    onClick={() => navigate("/auth?mode=signup&redirect=" + encodeURIComponent(window.location.pathname))}
                                >
                                    Sign Up to Apply
                                    {isPremium && <Info className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            {isPremium && (
                                <TooltipContent>
                                    <p>This is a premium government job. Please subscribe to apply.</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                    <p className="text-[10px] text-center text-muted-foreground">Sign up to unlock application link and tracking</p>
                </div>
            );
        }

        // Paid User Flow
        if (isPaidUser) {
            return (
                <Button asChild className="w-full gap-2 h-12 text-md font-bold" variant="hero">
                    <a href={job.apply_url || "#"} target="_blank" rel="noopener noreferrer">
                        Apply Now
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </Button>
            );
        }

        // Free User + Premium Job
        if (isPremium) {
            return (
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => navigate("/dashboard/subscription")}
                        className="w-full gap-2 h-12 text-md font-bold"
                        variant="hero"
                    >
                        Upgrade to Apply
                        <ShieldAlert className="h-4 w-4" />
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground italic truncate">This job requires a PRO subscription</p>
                </div>
            );
        }

        // Free User + Free Job
        return (
            <Button asChild className="w-full gap-2 h-12 text-md font-bold" variant="hero">
                <a href={job.apply_url || "#"} target="_blank" rel="noopener noreferrer">
                    Apply Now
                    <ExternalLink className="h-4 w-4" />
                </a>
            </Button>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!job) return null;

    // Structured Data for Google Jobs
    const structuredData = job.job_posting_json || {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "title": job.post_name,
        "description": job.description || job.summary,
        "hiringOrganization": {
            "@type": "Organization",
            "name": job.organization,
            "sameAs": job.official_website
        },
        "employmentType": "FULL_TIME",
        "datePosted": job.application_start_date || new Date().toISOString(),
        "validThrough": job.application_end_date,
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressCountry": "IN",
                "addressRegion": job.location || "India"
            }
        }
    };

    return (
        <>
            <Helmet>
                <title>{job.meta_title || `${job.post_name} at ${job.organization} Recruitment 2026`}</title>
                <meta name="description" content={job.meta_description || job.summary || `Apply for ${job.post_name} at ${job.organization}. Eligibility, dates, selection process and direct application link.`} />
                <link rel="canonical" href={`https://startworking.in/government-jobs/${job.slug}`} />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />

                <main className="flex-1 container mx-auto px-4 py-8">
                    <div className="max-w-5xl mx-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/government-jobs")}
                            className="mb-8 hover:bg-accent/10 -ml-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to All Jobs
                        </Button>

                        <div className="grid lg:grid-cols-3 gap-12">
                            {/* Main Content Area */}
                            <div className="lg:col-span-2 space-y-12">
                                {/* Header */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                                            {job.organization}
                                        </Badge>
                                        {job.visibility === 'premium' && (
                                            <Badge variant="accent" className="font-bold py-1">Premium Job</Badge>
                                        )}
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto bg-muted/30 px-3 py-1 rounded-full">
                                            <MapPin className="h-3.5 w-3.5 text-accent" />
                                            {job.location || 'India'}
                                        </div>
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-[1.1]">
                                        {job.post_name}
                                    </h1>
                                    {job.exam_name && (
                                        <p className="text-xl text-muted-foreground font-medium">{job.exam_name}</p>
                                    )}
                                </div>

                                {/* Summary */}
                                {job.summary && (
                                    <Card className="bg-muted/30 border-none shadow-none">
                                        <CardContent className="p-6">
                                            <p className="text-muted-foreground leading-relaxed italic">
                                                {job.summary}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Key Dates Inline */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-card border">
                                        <Calendar className="h-5 w-5 text-accent mt-1" />
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-1">Last Date to Apply</p>
                                            <p className="font-bold">
                                                {job.application_end_date ? format(new Date(job.application_end_date), 'MMMM dd, yyyy') : 'Not Specified'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-card border">
                                        <Building2 className="h-5 w-5 text-accent mt-1" />
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-1">Application Mode</p>
                                            <p className="font-bold">{job.mode_of_apply || 'Online'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Sections */}
                                <div className="space-y-12">
                                    {/* Description / Overview */}
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                                                <FileText className="h-4 w-4 text-accent" />
                                            </div>
                                            Detailed Notification Overview
                                        </h2>
                                        <div
                                            className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed marker:text-accent selection:bg-accent/20"
                                            dangerouslySetInnerHTML={{ __html: job.description || "No detailed description available." }}
                                        />
                                    </div>

                                    {/* Application Fee */}
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                                <Info className="h-4 w-4 text-success" />
                                            </div>
                                            Fee Structure
                                        </h2>
                                        <Card className="border-success/10 bg-success/5">
                                            <CardContent className="p-6">
                                                <p className="text-muted-foreground leading-relaxed">
                                                    {job.application_fee || "Please refer to the official notification for detailed fee structure based on your category."}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Selection Process Placeholder (if not in description) */}
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                                                <CheckCircle2 className="h-4 w-4 text-warning" />
                                            </div>
                                            How to Apply
                                        </h2>
                                        <div className="bg-card border rounded-2xl p-6 space-y-4">
                                            <ol className="list-decimal list-inside space-y-3 text-muted-foreground text-sm">
                                                <li>Visit the official website link provided in the sidebar.</li>
                                                <li>Navigate to the "Recruitment" or "Careers" section.</li>
                                                <li>Search for the advertisement number <strong>{job.advertisement_no || "N/A"}</strong>.</li>
                                                <li>Fill in the registration details and complete your profile.</li>
                                                <li>Upload required documents (Photo, Signature, Education Certificates).</li>
                                                <li>Pay the application fee if applicable.</li>
                                                <li>Take a printout of the final submitted application form.</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Sidebar */}
                            <div className="space-y-6">
                                <Card className="sticky top-24 border-border/50 shadow-xl shadow-black/5 overflow-hidden">
                                    <div className="h-2 bg-accent opacity-80" />
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Advertisement No.</p>
                                            <p className="font-bold text-lg">{job.advertisement_no || "N/A"}</p>
                                        </div>

                                        <div className="space-y-4 pt-1">
                                            {renderApplyButton()}
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2 border-accent/20 hover:bg-accent/5 text-accent"
                                                onClick={handleAddToTracker}
                                                disabled={isAddingToTracker}
                                            >
                                                {isAddingToTracker ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Plus className="h-4 w-4" />
                                                )}
                                                Add to Tracker
                                            </Button>
                                        </div>

                                        <div className="space-y-4 pt-6 border-t font-medium">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Starting Date</span>
                                                <span>{job.application_start_date ? format(new Date(job.application_start_date), 'MMM dd, yyyy') : 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Category</span>
                                                <span className="text-accent">{job.visibility.toUpperCase()}</span>
                                            </div>
                                        </div>

                                        {job.official_website && (
                                            <div className="pt-6">
                                                <Link
                                                    to={job.official_website}
                                                    target="_blank"
                                                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
                                                >
                                                    <Globe className="h-3.5 w-3.5" />
                                                    Visit Department Website
                                                    <ExternalLink className="h-3 w-3 ml-auto" />
                                                </Link>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-card border-dashed border-border/50">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-center gap-2 text-warning">
                                            <AlertCircle className="h-4 w-4" />
                                            <h4 className="text-sm font-bold">Disclaimer</h4>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            While we strive to provide accurate information, readers are advised to check the official notification before applying. JobSeeker is not responsible for any selection/rejection or errors in the department's notification.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>

                <FooterSection />
            </div>
        </>
    );
};

export default GovtJobDetail;
