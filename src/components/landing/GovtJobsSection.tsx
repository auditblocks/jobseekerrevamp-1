import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ChevronRight,
    Calendar,
    MapPin,
    Briefcase,
    Loader2,
    Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface GovtJob {
    id: string;
    organization: string;
    post_name: string;
    application_end_date: string | null;
    visibility: string;
    slug: string;
    location: string;
    tags: string[];
}

const GovtJobsSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [jobs, setJobs] = useState<GovtJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLatestJobs = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from("govt_jobs" as any)
                    .select("id, organization, post_name, application_end_date, visibility, slug, location, tags")
                    .eq("status", "active")
                    .order("created_at", { ascending: false })
                    .limit(3);

                if (error) throw error;
                setJobs((data as unknown as GovtJob[]) || []);
            } catch (error) {
                console.error("Error fetching homepage govt jobs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLatestJobs();
    }, []);

    const handleJobClick = (job: GovtJob) => {
        if (!user) {
            navigate("/auth?mode=signup&redirect=" + encodeURIComponent(`/government-jobs/${job.slug || job.id}`));
            return;
        }
        navigate(`/government-jobs/${job.slug || job.id}`);
    };

    if (isLoading && jobs.length === 0) {
        return (
            <section className="py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                </div>
            </section>
        );
    }

    if (!isLoading && jobs.length === 0) return null;

    return (
        <section className="py-24 bg-background relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-accent/5 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-primary/5 blur-[100px] rounded-full" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider"
                    >
                        <Briefcase className="w-3.5 h-3.5" />
                        Latest Notifications
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-bold tracking-tight text-foreground"
                    >
                        Government Job Opportunities
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted-foreground"
                    >
                        Stay updated with the latest central and state government job openings.
                        Track deadlines and apply directly from our platform.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    {jobs.map((job, index) => (
                        <motion.div
                            key={job.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                className="h-full hover:shadow-2xl hover:shadow-accent/5 transition-all duration-500 border-border/50 hover:border-accent/30 flex flex-col group cursor-pointer bg-card/50 backdrop-blur-sm"
                                onClick={() => handleJobClick(job)}
                            >
                                <CardContent className="p-8 flex flex-col h-full space-y-5">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                                            {job.organization}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            {job.visibility === 'premium' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="h-4 w-4 text-accent cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="max-w-xs">Sign up and subscribe to Apply the job</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <Badge variant="accent" className="text-[10px] uppercase font-bold px-2 py-0.5">
                                                        Premium
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 py-0.5 bg-success/10 text-success border-success/20">
                                                    Free
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-accent transition-colors line-clamp-2">
                                            {job.post_name}
                                        </h3>

                                        {job.tags && job.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {job.tags.slice(0, 2).map((tag, i) => (
                                                    <span key={i} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-border/50">
                                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4 text-accent/70" />
                                            <span className="truncate font-medium">{job.location || 'India'}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4 text-accent/70" />
                                            <span className="font-medium">Due: {job.application_end_date ? format(new Date(job.application_end_date), 'MMM dd, yyyy') : 'N/A'}</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="secondary"
                                        className="w-full mt-2 bg-muted/50 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300 font-bold"
                                    >
                                        {!user ? "Sign Up to View Details" : "View Details"}
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="text-center">
                    <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full px-8 border-accent/20 hover:bg-accent hover:text-accent-foreground transition-all duration-300"
                        onClick={() => navigate("/government-jobs")}
                    >
                        View All Government Jobs
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default GovtJobsSection;
