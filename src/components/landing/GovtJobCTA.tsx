import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Briefcase, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GovtJobCTA = () => {
    const navigate = useNavigate();
    return (
        <section className="py-20 bg-background relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto rounded-[2.5rem] bg-gradient-to-br from-primary/95 to-primary border border-primary-foreground/10 p-8 md:p-16 relative overflow-hidden shadow-2xl">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[100px] translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-wider"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Exclusive Feature
                            </motion.div>
                            <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight">
                                Explore <span className="text-accent">Government Jobs</span> Verification
                            </h2>
                            <p className="text-lg text-primary-foreground/70 max-w-2xl leading-relaxed">
                                Stay ahead with the latest central and state government job notifications.
                                Verified updates, application deadlines, and structured job tracking all in one place.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                                <Button
                                    size="lg"
                                    variant="hero"
                                    className="rounded-full px-8 h-14 text-md font-bold"
                                    onClick={() => navigate("/government-jobs")}
                                >
                                    View All Government Jobs
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 max-w-[400px] hidden md:block">
                            {/* Graphic or icon */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full animate-pulse-slow" />
                                <div className="relative bg-card/10 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl transform hover:rotate-2 transition-all duration-500">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
                                            <Briefcase className="w-6 h-6 text-accent-foreground" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-primary-foreground">Latest Notification</div>
                                            <div className="text-xs text-primary-foreground/50">Updated just now</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-4 bg-white/10 rounded-full w-full" />
                                        <div className="h-4 bg-white/10 rounded-full w-[85%]" />
                                        <div className="h-4 bg-white/5 rounded-full w-[60%]" />
                                        <div className="pt-4">
                                            <div className="h-12 bg-accent/20 rounded-xl w-full flex items-center justify-center text-accent text-xs font-bold border border-accent/20">
                                                Track Job Application
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Badge */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="absolute -top-4 -right-4 bg-accent p-3 rounded-2xl shadow-xl text-accent-foreground font-bold text-xs"
                                >
                                    PRO
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default GovtJobCTA;
