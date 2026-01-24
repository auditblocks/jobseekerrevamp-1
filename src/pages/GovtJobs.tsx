import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Search,
    Briefcase,
    Building2,
    Calendar,
    LockKeyhole,
    Loader2,
    Sparkles,
    ExternalLink,
    ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface GovtJob {
    id: string;
    organization: string;
    post_name: string;
    exam_name: string | null;
    application_end_date: string | null;
    mode_of_apply: string | null;
    visibility: string;
    status: string;
}

const GovtJobs = () => {
    const navigate = useNavigate();
    const { profile, loading: authLoading } = useAuth();
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
                .select("id, organization, post_name, exam_name, application_end_date, mode_of_apply, visibility, status")
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

    // Tier logic: Only show first 5 for free users
    const displayedJobs = isPaidUser ? filteredJobs : filteredJobs.slice(0, 10); // Changed to 10 as per user request (Wait, request said 5. Let's stick to 5).
    // Actually the request said: "Free: View only 5 jobs".
    const finalJobs = isPaidUser ? filteredJobs : filteredJobs.slice(0, 5);
    const remainingCount = filteredJobs.length - 5;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Apply Govt. Jobs | JobSeeker</title>
            </Helmet>

            <div className="min-h-screen bg-background pb-12">
                <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <h1 className="text-xl font-bold">Govt. Jobs</h1>
                        </div>
                        {!isPaidUser && (
                            <Button variant="accent" size="sm" onClick={() => navigate("/dashboard/subscription")} className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Upgrade for Full Access
                            </Button>
                        )}
                    </div>
                </header>

                <main className="container mx-auto px-4 pt-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by organization or post..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-12"
                            />
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : finalJobs.length === 0 ? (
                            <div className="text-center py-20 border rounded-2xl bg-card/50">
                                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                <p className="text-muted-foreground">No active govt. jobs found at the moment.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {finalJobs.map((job, index) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="hover:border-accent/30 transition-all group overflow-hidden">
                                            <CardContent className="p-0">
                                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-1 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                                                {job.organization}
                                                            </Badge>
                                                            {job.visibility === 'premium' && (
                                                                <Badge variant="accent" className="text-[10px] uppercase font-bold">
                                                                    Premium
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                                                            {job.post_name}
                                                        </h3>
                                                        {job.exam_name && (
                                                            <p className="text-sm text-muted-foreground">{job.exam_name}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <Calendar className="h-4 w-4" />
                                                            <span>End: {job.application_end_date ? format(new Date(job.application_end_date), 'MMM dd, yyyy') : 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <Building2 className="h-4 w-4" />
                                                            <span>{job.mode_of_apply}</span>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="bg-accent/10 hover:bg-accent hover:text-accent-foreground text-accent border-0"
                                                        onClick={() => navigate(`/govt-jobs/${job.id}`)}
                                                    >
                                                        View Details
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}

                                {!isPaidUser && remainingCount > 0 && (
                                    <Card className="border-dashed bg-muted/20">
                                        <CardContent className="p-8 text-center space-y-4">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                                                <LockKeyhole className="h-5 w-5 text-accent" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg">+{remainingCount} more jobs available</h4>
                                                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                                    Upgrade to a Premium plan to unlock access to all government job opportunities and detailed notifications.
                                                </p>
                                            </div>
                                            <Button variant="accent" onClick={() => navigate("/dashboard/subscription")} className="gap-2">
                                                <Sparkles className="h-4 w-4" />
                                                Unlock All Jobs
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
};

export default GovtJobs;
