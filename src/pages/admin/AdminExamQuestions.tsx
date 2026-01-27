import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2,
    Plus,
    Trash2,
    Save,
    ArrowLeft,
    CheckCircle2,
    HelpCircle,
    PenLine,
    Sparkles,
} from "lucide-react";

interface Question {
    id?: string;
    job_id: string;
    type: 'mcq' | 'fill_blank';
    question_text: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string | null;
}

const AdminExamQuestions = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [job, setJob] = useState<any>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    useEffect(() => {
        if (jobId) {
            fetchJobDetails();
            fetchQuestions();
        }
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            const { data, error } = await supabase
                .from("govt_jobs" as any)
                .select("*")
                .eq("id", jobId)
                .single();
            if (error) throw error;
            setJob(data);
        } catch (error) {
            console.error("Error fetching job:", error);
            toast.error("Failed to fetch job details");
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("exam_questions" as any)
                .select("*")
                .eq("job_id", jobId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            setQuestions((data as any) || []);
        } catch (error) {
            console.error("Error fetching questions:", error);
            toast.error("Failed to load questions");
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = () => {
        setEditingQuestion({
            job_id: jobId!,
            type: 'mcq',
            question_text: "",
            options: ["", "", "", ""],
            correct_answer: "",
            explanation: ""
        });
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion({ ...question });
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
            const { error } = await supabase
                .from("exam_questions" as any)
                .delete()
                .eq("id", id);
            if (error) throw error;
            toast.success("Question deleted");
            fetchQuestions();
        } catch (error) {
            console.error("Error deleting question:", error);
            toast.error("Failed to delete question");
        }
    };

    const handleSaveQuestion = async () => {
        if (!editingQuestion) return;
        if (!editingQuestion.question_text || !editingQuestion.correct_answer) {
            toast.error("Please fill in the question and correct answer");
            return;
        }

        setSaving(true);
        try {
            const payload = { ...editingQuestion };
            if (payload.id) {
                const { error } = await supabase
                    .from("exam_questions" as any)
                    .update(payload)
                    .eq("id", payload.id);
                if (error) throw error;
                toast.success("Question updated");
            } else {
                const { error } = await supabase
                    .from("exam_questions" as any)
                    .insert([payload]);
                if (error) throw error;
                toast.success("Question added");
            }
            setEditingQuestion(null);
            fetchQuestions();
        } catch (error) {
            console.error("Error saving question:", error);
            toast.error("Failed to save question");
        } finally {
            setSaving(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!confirm("This will use AI to generate 10 questions based on the job details. Continue?")) return;

        setSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke("generate-exam-questions", {
                body: {
                    jobId: jobId,
                    examName: job?.exam_name || "",
                    postName: job?.post_name || "",
                    organization: job?.organization || ""
                }
            });

            if (error) throw error;
            toast.success("AI generated 10 questions successfully!");
            fetchQuestions();
        } catch (error: any) {
            console.error("Error generating with AI:", error);
            toast.error(error.message || "Failed to generate questions with AI");
        } finally {
            setSaving(false);
        }
    };

    const handleClearAllQuestions = async () => {
        if (!confirm("Are you sure you want to delete ALL questions for this job? This action cannot be undone.")) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("exam_questions" as any)
                .delete()
                .eq("job_id", jobId);

            if (error) throw error;
            toast.success("All questions deleted successfully");
            fetchQuestions();
        } catch (error: any) {
            console.error("Error clearing questions:", error);
            toast.error(error.message || "Failed to clear questions");
        } finally {
            setSaving(false);
        }
    };

    if (loading && !job) {
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
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/admin/govt-jobs")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Manage Exam Questions</h1>
                            <p className="text-muted-foreground">{job?.post_name} - {job?.organization}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleAIGenerate}
                            disabled={saving}
                            className="gap-2 border-accent text-accent hover:bg-accent hover:text-white"
                        >
                            <Sparkles className="h-4 w-4" /> AI Bulk Generate
                        </Button>
                        <Button onClick={handleAddQuestion} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Question
                        </Button>
                        {questions.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleClearAllQuestions}
                                disabled={saving}
                                className="gap-2"
                            >
                                <Trash2 className="h-4 w-4" /> Clear All
                            </Button>
                        )}
                    </div>
                </div>

                {editingQuestion && (
                    <Card className="border-accent/20 bg-accent/5">
                        <CardHeader>
                            <CardTitle>{editingQuestion.id ? "Edit Question" : "New Question"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Question Type</Label>
                                    <Select
                                        value={editingQuestion.type}
                                        onValueChange={(val: 'mcq' | 'fill_blank') =>
                                            setEditingQuestion({
                                                ...editingQuestion,
                                                type: val,
                                                options: val === 'mcq' ? ["", "", "", ""] : null
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                                            <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Question Text</Label>
                                <Textarea
                                    value={editingQuestion.question_text}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                                    placeholder="Enter the question..."
                                    className="min-h-[100px]"
                                />
                            </div>

                            {editingQuestion.type === 'mcq' && (
                                <div className="space-y-4">
                                    <Label>Options</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {editingQuestion.options?.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <span className="text-xs font-bold text-muted-foreground w-6">
                                                    {String.fromCharCode(65 + idx)}.
                                                </span>
                                                <Input
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOpts = [...(editingQuestion.options || [])];
                                                        newOpts[idx] = e.target.value;
                                                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                                                    }}
                                                    placeholder={`Option ${idx + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Correct Answer</Label>
                                <Input
                                    value={editingQuestion.correct_answer}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                                    placeholder={editingQuestion.type === 'mcq' ? "e.g. Option 1" : "Enter the correct text"}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Explanation (Optional)</Label>
                                <Textarea
                                    value={editingQuestion.explanation || ""}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                                    placeholder="Explain why this is the correct answer..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setEditingQuestion(null)}>Cancel</Button>
                                <Button onClick={handleSaveQuestion} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" /> Save Question
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-4">
                    {questions.length === 0 ? (
                        <div className="text-center py-12 border rounded-xl bg-muted/20">
                            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">No questions added yet for this job.</p>
                        </div>
                    ) : (
                        questions.map((q, idx) => (
                            <Card key={q.id} className="hover:border-accent/30 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                                                    {q.type}
                                                </span>
                                                <span className="text-xs text-muted-foreground">Question {idx + 1}</span>
                                            </div>
                                            <p className="font-medium text-lg">{q.question_text}</p>
                                            {q.type === 'mcq' && q.options && (
                                                <div className="grid grid-cols-2 gap-2 mt-4">
                                                    {q.options.map((opt, i) => (
                                                        <div key={i} className={`text-sm p-2 rounded border ${q.correct_answer === opt ? 'bg-success/10 border-success/30 text-success font-medium' : 'bg-muted/30 border-transparent'}`}>
                                                            {String.fromCharCode(65 + i)}. {opt}
                                                            {q.correct_answer === opt && <CheckCircle2 className="h-3 w-3 inline ml-2" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {q.type === 'fill_blank' && (
                                                <p className="text-sm mt-2">
                                                    <span className="text-muted-foreground">Answer:</span> <span className="font-semibold text-success">{q.correct_answer}</span>
                                                </p>
                                            )}
                                            {q.explanation && (
                                                <div className="mt-4 p-3 bg-muted/50 rounded text-sm text-muted-foreground italic">
                                                    <strong>Explanation:</strong> {q.explanation}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditQuestion(q)}>
                                                <PenLine className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => q.id && handleDeleteQuestion(q.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminExamQuestions;
