import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

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
    visibility: string;
}

const GovtJobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState<GovtJob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingToTracker, setIsAddingToTracker] = useState(false);

    useEffect(() => {
        if (id) fetchJobDetail();
    }, [id]);

    const fetchJobDetail = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("govt_jobs")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            setJob(data);
        } catch (error) {
            console.error("Error fetching job detail:", error);
            toast.error("Failed to load job details");
            navigate("/govt-jobs");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToTracker = async () => {
        if (!job || !user) return;

        try {
            setIsAddingToTracker(true);
            const { error } = await supabase.from("job_tracker").insert({
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!job) return null;

    return (
        <>
            <Helmet>
                <title>{job.post_name} - {job.organization} | JobSeeker</title>
            </Helmet>

            <div className="min-h-screen bg-background pb-20">
                <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate("/govt-jobs")}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <h1 className="text-lg font-bold truncate max-w-[200px] sm:max-w-md">Job Details</h1>
                        </div>
                        <Button
                            onClick={handleAddToTracker}
                            disabled={isAddingToTracker}
                            className="gap-2"
                            variant="outline"
                        >
                            {isAddingToTracker ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            Add to Tracker
                        </Button>
                    </div>
                </header>

                <main className="container mx-auto px-4 pt-8">
                    <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Header Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-accent/10 text-accent border-accent/20">
                                        {job.organization}
                                    </Badge>
                                    {job.visibility === 'premium' && (
                                        <Badge variant="accent" className="font-bold">Premium</Badge>
                                    )}
                                </div>
                                <h1 className="text-3xl font-bold text-foreground leading-tight">
                                    {job.post_name}
                                </h1>
                                {job.exam_name && (
                                    <p className="text-xl text-muted-foreground">{job.exam_name}</p>
                                )}
                            </div>

                            {/* Main Info Cards */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Card className="bg-card/50">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">End Date</p>
                                            <p className="font-bold flex items-center gap-2">
                                                {job.application_end_date ? format(new Date(job.application_end_date), 'MMM dd, yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
                                            <Globe className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Mode of Apply</p>
                                            <p className="font-bold">{job.mode_of_apply}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Description */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-lg font-bold">
                                    <FileText className="h-5 w-5 text-accent" />
                                    <h2>Job Description & Requirements</h2>
                                </div>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                                            {job.description || "No detailed description available."}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Important Instructions */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-lg font-bold">
                                    <Info className="h-5 w-5 text-warning" />
                                    <h2>Important Instructions</h2>
                                </div>
                                <Card className="border-warning/20 bg-warning/5">
                                    <CardContent className="p-6 space-y-3">
                                        <p className="text-sm text-muted-foreground">
                                            • Read the official notification carefully before applying.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            • Keep all scanned documents ready as per specified sizes.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            • Ensure you have a valid mobile number and email ID for registration.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            • Save the application number and take a printout of the final form.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Sidebar Stats/CTAs */}
                        <div className="space-y-6">
                            <Card className="sticky top-24">
                                <CardContent className="p-6 space-y-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Application Fee</p>
                                        <p className="text-2xl font-bold text-success">{job.application_fee || "N/A"}</p>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Advt No:</span>
                                            <span className="font-medium">{job.advertisement_no || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Starts:</span>
                                            <span className="font-medium">
                                                {job.application_start_date ? format(new Date(job.application_start_date), 'MMM dd') : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6">
                                        {job.apply_url && (
                                            <Button asChild className="w-full gap-2 h-12 text-md font-bold" variant="hero">
                                                <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                                                    Apply Now
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                        {job.official_website && (
                                            <Button asChild variant="outline" className="w-full gap-2">
                                                <a href={job.official_website} target="_blank" rel="noopener noreferrer">
                                                    Official Website
                                                    <Globe className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-accent/5 border-dashed border-accent/20">
                                <CardContent className="p-6 text-center space-y-3">
                                    <CheckCircle2 className="h-8 w-8 text-accent mx-auto" />
                                    <p className="text-sm font-semibold">Real-time Updates</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Track this job and get notifications for Admit Cards, Exams, and Results directly.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default GovtJobDetail;
