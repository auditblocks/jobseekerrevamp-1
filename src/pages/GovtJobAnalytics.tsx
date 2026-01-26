import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    TrendingUp,
    History,
    Target,
    Award,
    ChevronRight,
    Search,
    Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const GovtJobAnalytics = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalExams: 0,
        averageScore: 0,
        highestScore: 0,
        totalQuestions: 0,
    });

    useEffect(() => {
        if (user) {
            fetchAnalytics();
        }
    }, [user]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("user_exams" as any)
                .select("*, govt_jobs(post_name, organization)")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setExams(data || []);

            if (data && data.length > 0) {
                const total = data.length;
                const avg = data.reduce((acc: number, curr: any) => acc + (curr.score / curr.total_questions), 0) / total;
                const high = Math.max(...data.map((ex: any) => (ex.score / ex.total_questions)));
                const totalQ = data.reduce((acc: number, curr: any) => acc + curr.total_questions, 0);

                setStats({
                    totalExams: total,
                    averageScore: Math.round(avg * 100),
                    highestScore: Math.round(high * 100),
                    totalQuestions: totalQ,
                });
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Your Performance Analytics</h1>
                        <p className="text-muted-foreground mt-2">Track your progress across different government job exams</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <History className="h-4 w-4" /> Tests Taken
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalExams}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> Average Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.averageScore}%</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-warning/10 to-transparent border-warning/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Award className="h-4 w-4" /> Best Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.highestScore}%</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Target className="h-4 w-4" /> Questions Solved
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Search className="h-5 w-5" /> Recent Practice Sessions
                    </h2>

                    {exams.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-12 text-center space-y-4">
                                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                    <TrendingUp className="h-8 w-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg">No exam history yet</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                                        Start practicing with government job exams to see your analytics here.
                                    </p>
                                </div>
                                <Link to="/government-jobs">
                                    <Button variant="accent">Explore Jobs</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {exams.map((exam) => (
                                <Card key={exam.id} className="hover:border-accent/30 transition-all group overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="flex items-center p-6 gap-6">
                                            <div className="flex flex-col items-center justify-center bg-muted/30 rounded-xl p-4 min-w-[100px] border border-border/50">
                                                <span className="text-2xl font-bold">{Math.round((exam.score / exam.total_questions) * 100)}%</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Score</span>
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
                                                    {exam.govt_jobs?.post_name || "Unknown Job"}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1.5 font-medium">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {format(new Date(exam.created_at), "PPP")}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Target className="h-3.5 w-3.5" />
                                                        {exam.score} / {exam.total_questions} Correct
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Link to={`/govt-jobs/exam/${exam.job_id}`}>
                                                    <Button variant="ghost" className="gap-2 group-hover:bg-accent group-hover:text-white transition-all">
                                                        Retake <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default GovtJobAnalytics;
