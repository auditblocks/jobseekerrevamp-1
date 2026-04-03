import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
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
import { toast } from "sonner";

type GovtJobEmbed = {
    post_name: string | null;
    organization: string | null;
    exam_name: string | null;
} | null;

interface UserExamRow {
    id: string;
    user_id: string;
    job_id: string;
    score: number;
    total_questions: number;
    status: string | null;
    created_at: string;
    completed_at: string | null;
    govt_jobs?: GovtJobEmbed | GovtJobEmbed[];
}

function normalizeJob(embed: UserExamRow["govt_jobs"]): GovtJobEmbed {
    if (!embed) return null;
    if (Array.isArray(embed)) return embed[0] ?? null;
    return embed;
}

function scorePercent(score: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.round((score / total) * 100);
}

const GovtJobAnalytics = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [exams, setExams] = useState<UserExamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalExams: 0,
        averageScore: 0,
        highestScore: 0,
        totalQuestions: 0,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
    }, [authLoading, user, navigate]);

    const fetchAnalytics = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("user_exams" as never)
                .select(
                    "id, user_id, job_id, score, total_questions, status, created_at, completed_at, govt_jobs(post_name, organization, exam_name)",
                )
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const rows = (data || []) as UserExamRow[];
            setExams(rows);

            if (rows.length > 0) {
                const total = rows.length;
                const percents = rows.map((r) => scorePercent(r.score, r.total_questions));
                const avg = percents.reduce((a, b) => a + b, 0) / total;
                const high = Math.max(...percents);
                const totalQ = rows.reduce((acc, r) => acc + (r.total_questions || 0), 0);

                setStats({
                    totalExams: total,
                    averageScore: Math.round(avg),
                    highestScore: high,
                    totalQuestions: totalQ,
                });
            } else {
                setStats({
                    totalExams: 0,
                    averageScore: 0,
                    highestScore: 0,
                    totalQuestions: 0,
                });
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
            toast.error("Could not load your exam history. Please try again.");
            setExams([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            fetchAnalytics();
        }
    }, [user?.id, fetchAnalytics]);

    if (authLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <DashboardLayout>
            <Helmet>
                <title>Exam analytics | JobSeeker</title>
            </Helmet>

            <div className="container mx-auto px-4 pt-8 pb-12">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Exam analytics</h1>
                            <p className="text-muted-foreground mt-2">
                                Practice tests you&apos;ve taken for government job listings
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center min-h-[280px]">
                            <Loader2 className="h-8 w-8 animate-spin text-accent" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <History className="h-4 w-4" /> Tests taken
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.totalExams}</div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" /> Average score
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.averageScore}%</div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-warning/10 to-transparent border-warning/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Award className="h-4 w-4" /> Best score
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.highestScore}%</div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Target className="h-4 w-4" /> Questions attempted
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Search className="h-5 w-5" /> Your exams
                                </h2>

                                {exams.length === 0 ? (
                                    <Card className="border-dashed">
                                        <CardContent className="py-12 text-center space-y-4">
                                            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                                <TrendingUp className="h-8 w-8" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="font-bold text-lg">No exams yet</h3>
                                                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                                                    Open a government job and start a practice test. Your attempts will
                                                    show up here.
                                                </p>
                                            </div>
                                            <Link to="/government-jobs">
                                                <Button variant="accent">Browse government jobs</Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid gap-4">
                                        {exams.map((exam) => {
                                            const job = normalizeJob(exam.govt_jobs);
                                            const title =
                                                job?.post_name?.trim() ||
                                                job?.exam_name?.trim() ||
                                                "Government job practice test";
                                            const org = job?.organization?.trim();
                                            const pct = scorePercent(exam.score, exam.total_questions);
                                            const status = exam.status || "completed";

                                            return (
                                                <Card
                                                    key={exam.id}
                                                    className="hover:border-accent/30 transition-all group overflow-hidden"
                                                >
                                                    <CardContent className="p-0">
                                                        <div className="flex flex-col sm:flex-row sm:items-center p-6 gap-6">
                                                            <div className="flex flex-col items-center justify-center bg-muted/30 rounded-xl p-4 min-w-[100px] border border-border/50 shrink-0">
                                                                <span className="text-2xl font-bold">{pct}%</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                                    Score
                                                                </span>
                                                            </div>

                                                            <div className="flex-1 space-y-2 min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <h3 className="font-bold text-lg group-hover:text-accent transition-colors break-words">
                                                                        {title}
                                                                    </h3>
                                                                    <Badge variant="secondary" className="shrink-0 capitalize">
                                                                        {status.replace("_", " ")}
                                                                    </Badge>
                                                                </div>
                                                                {org ? (
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {org}
                                                                    </p>
                                                                ) : null}
                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                                    <span className="flex items-center gap-1.5 font-medium">
                                                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                                        {format(
                                                                            new Date(
                                                                                exam.completed_at || exam.created_at,
                                                                            ),
                                                                            "PPP",
                                                                        )}
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Target className="h-3.5 w-3.5 shrink-0" />
                                                                        {exam.score} / {exam.total_questions} correct
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center sm:justify-end">
                                                                <Link to={`/govt-jobs/exam/${exam.job_id}`}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="gap-2 group-hover:bg-accent group-hover:text-accent-foreground transition-all"
                                                                    >
                                                                        Practice again{" "}
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default GovtJobAnalytics;
