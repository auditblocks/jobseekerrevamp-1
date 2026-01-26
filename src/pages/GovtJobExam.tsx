import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
    Loader2,
    Timer,
    ChevronRight,
    ChevronLeft,
    Send,
    AlertCircle,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
    id: string;
    type: 'mcq' | 'fill_blank';
    question_text: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string | null;
}

const GovtJobExam = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes default
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [job, setJob] = useState<any>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (jobId) {
            fetchJobAndQuestions();
        }
    }, [jobId]);

    useEffect(() => {
        if (questions.length > 0 && !isCompleted && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [questions, isCompleted]);

    const fetchJobAndQuestions = async () => {
        try {
            setLoading(true);
            const [jobRes, questionsRes] = await Promise.all([
                supabase.from("govt_jobs" as any).select("*").eq("id", jobId).single(),
                supabase.from("exam_questions" as any).select("*").eq("job_id", jobId)
            ]);

            if (jobRes.error) throw jobRes.error;
            if (questionsRes.error) throw questionsRes.error;

            setJob(jobRes.data);
            setQuestions((questionsRes.data as any) || []);

            // Set timer based on number of questions (1 min per question)
            if (questionsRes.data?.length) {
                setTimeLeft(questionsRes.data.length * 60);
            }
        } catch (error) {
            console.error("Error fetching exam data:", error);
            toast.error("Failed to load exam. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        if (isSubmitting || isCompleted) return;
        setIsSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            let score = 0;
            const responses = questions.map(q => {
                const userAnswer = answers[q.id] || "";
                const isCorrect = userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                if (isCorrect) score++;
                return {
                    question_id: q.id,
                    selected_answer: userAnswer,
                    is_correct: isCorrect
                } as any;
            });

            // Save to user_exams
            const { data: examData, error: examError } = await supabase
                .from("user_exams" as any)
                .insert([{
                    user_id: user?.id,
                    job_id: jobId,
                    score: score,
                    total_questions: questions.length,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (examError) throw examError;

            // Save responses
            const responsePayload = responses.map(r => ({
                user_exam_id: examData.id,
                ...r
            }));

            const { error: responseError } = await supabase
                .from("user_exam_responses" as any)
                .insert(responsePayload);

            if (responseError) throw responseError;

            setResult({
                score,
                total: questions.length,
                responses
            });
            setIsCompleted(true);
            toast.success("Exam submitted successfully!");
        } catch (error) {
            console.error("Error submitting exam:", error);
            toast.error("Failed to submit exam. Your progress might not be saved.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="text-muted-foreground animate-pulse">Preparing your exam...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 p-4 text-center">
                <AlertCircle className="h-16 w-16 text-warning opacity-50" />
                <h1 className="text-2xl font-bold">No questions available</h1>
                <p className="text-muted-foreground">This job doesn't have any practice questions assigned yet.</p>
                <Button onClick={() => navigate("/government-jobs")}>Back to Jobs</Button>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
                <Card className="border-accent/20 bg-accent/5 overflow-hidden">
                    <div className="h-2 bg-accent shadow-[0_0_15px_rgba(var(--accent),0.5)]" />
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-3xl font-bold">Exam Completed!</CardTitle>
                        <p className="text-muted-foreground">Here is how you performed for {job?.post_name}</p>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="relative h-48 w-48 flex items-center justify-center">
                                <svg className="h-full w-full -rotate-90">
                                    <circle
                                        cx="96" cy="96" r="80"
                                        className="stroke-muted fill-none"
                                        strokeWidth="12"
                                    />
                                    <circle
                                        cx="96" cy="96" r="80"
                                        className="stroke-accent fill-none"
                                        strokeWidth="12"
                                        strokeDasharray={2 * Math.PI * 80}
                                        strokeDashoffset={2 * Math.PI * 80 * (1 - result.score / result.total)}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-5xl font-bold">{Math.round((result.score / result.total) * 100)}%</span>
                                    <span className="text-sm text-muted-foreground">Overall Score</span>
                                </div>
                            </div>
                            <p className="text-lg font-medium">
                                You got <span className="text-success font-bold">{result.score}</span> out of <span className="font-bold">{result.total}</span> questions correct.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="w-full" onClick={() => navigate("/government-jobs")}>Exit Practice</Button>
                            <Button className="w-full" onClick={() => window.location.reload()}>Try Again</Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <h2 className="text-xl font-bold">Review Your Answers</h2>
                    {questions.map((q, idx) => {
                        const response = result.responses.find((r: any) => r.question_id === q.id);
                        return (
                            <Card key={q.id} className={`border-l-4 ${response.is_correct ? 'border-l-success' : 'border-l-destructive'}`}>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium">Question {idx + 1}: {q.question_text}</p>
                                        {response.is_correct ?
                                            <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> :
                                            <XCircle className="h-5 w-5 text-destructive shrink-0" />
                                        }
                                    </div>
                                    <div className="text-sm space-y-2">
                                        <p><span className="text-muted-foreground">Your Answer:</span> <span className={response.is_correct ? 'text-success font-medium' : 'text-destructive font-medium'}>{response.selected_answer || "(No Answer)"}</span></p>
                                        {!response.is_correct && (
                                            <p><span className="text-muted-foreground">Correct Answer:</span> <span className="text-success font-medium">{q.correct_answer}</span></p>
                                        )}
                                    </div>
                                    {q.explanation && (
                                        <div className="p-3 bg-muted/30 rounded text-sm italic text-muted-foreground">
                                            <strong>Explanation:</strong> {q.explanation}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header / Timer */}
            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-accent" />
                        <div>
                            <h2 className="font-bold text-sm md:text-base truncate max-w-[200px] md:max-w-md">{job?.post_name}</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Practice Test</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 300 ? 'bg-destructive/10 border-destructive/20 text-destructive animate-pulse' : 'bg-accent/5 border-accent/20 text-accent font-mono'}`}>
                        <Timer className="h-4 w-4" />
                        <span className="font-bold">{formatTime(timeLeft)}</span>
                    </div>
                </div>
                <Progress value={progress} className="h-1 rounded-none bg-muted" />
            </div>

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                                {currentQuestion.question_text}
                            </h1>
                            <p className="text-sm text-muted-foreground font-medium">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {currentQuestion.type === 'mcq' ? (
                                <div className="grid gap-4">
                                    {currentQuestion.options?.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerChange(currentQuestion.id, option)}
                                            className={`flex items-center p-5 rounded-2xl border-2 text-left transition-all duration-200 group ${answers[currentQuestion.id] === option
                                                ? 'border-accent bg-accent/5 ring-4 ring-accent/10 shadow-lg'
                                                : 'border-border hover:border-accent/40 hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 shrink-0 transition-colors ${answers[currentQuestion.id] === option
                                                ? 'bg-accent text-white'
                                                : 'bg-muted text-muted-foreground group-hover:bg-accent/20 group-hover:text-accent'
                                                }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className="font-medium text-lg">{option}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Label className="text-lg font-medium">Type your answer below:</Label>
                                    <textarea
                                        className="w-full min-h-[150px] p-4 rounded-2xl border-2 border-border bg-background focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all text-xl"
                                        placeholder="Enter your answer here..."
                                        value={answers[currentQuestion.id] || ""}
                                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer Navigation */}
            <div className="sticky bottom-0 bg-background border-t p-4 md:p-6">
                <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
                    <Button
                        variant="secondary"
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="gap-2 h-12 px-6 rounded-xl"
                    >
                        <ChevronLeft className="h-5 w-5" /> Previous
                    </Button>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-accent hover:bg-accent/90 text-white gap-2 h-12 px-8 rounded-xl shadow-lg shadow-accent/20"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            Finish Exam
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            className="gap-2 h-12 px-8 rounded-xl"
                        >
                            Next <ChevronRight className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GovtJobExam;
