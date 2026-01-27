import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
    Loader2,
    Plus,
    Search,
    BookOpen,
    Clock,
    HelpCircle,
    Sparkles,
    Trash2,
    Edit3,
} from "lucide-react";

interface MasterExam {
    id: string;
    name: string;
    category: string;
    total_questions: number;
    time_minutes: number;
    section_distribution: any;
    difficulty_ratio: any;
    is_active: boolean;
}

interface GovtJob {
    id: string;
    post_name: string;
    organization: string;
}

const AdminExams = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState<MasterExam[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [jobs, setJobs] = useState<GovtJob[]>([]);
    const [selectedExam, setSelectedExam] = useState<MasterExam | null>(null);
    const [selectedJobId, setSelectedJobId] = useState("");
    const [generating, setGenerating] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        total_questions: 100,
        time_minutes: 120,
    });

    useEffect(() => {
        fetchExams();
        fetchJobs();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("master_exams")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setExams(data || []);

            // Extract unique categories
            const cats = Array.from(new Set((data || []).map((e: any) => e.category)));
            setCategories(cats as string[]);
        } catch (error) {
            console.error("Error fetching exams:", error);
            toast.error("Failed to fetch exam library");
        } finally {
            setLoading(false);
        }
    };

    const fetchJobs = async () => {
        try {
            const { data, error } = await supabase
                .from("govt_jobs")
                .select("id, post_name, organization")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setJobs(data || []);
        } catch (error) {
            console.error("Error fetching jobs:", error);
        }
    };

    const handleAddExam = async () => {
        if (!formData.name || !formData.category) {
            toast.error("Please fill in name and category");
            return;
        }

        try {
            const { error } = await supabase
                .from("master_exams")
                .insert([formData]);

            if (error) throw error;
            toast.success("Exam pattern added to library");
            setIsAddModalOpen(false);
            fetchExams();
            setFormData({ name: "", category: "", total_questions: 100, time_minutes: 120 });
        } catch (error) {
            console.error("Error adding exam:", error);
            toast.error("Failed to add exam pattern");
        }
    };

    const handleGenerateClick = (exam: MasterExam) => {
        setSelectedExam(exam);
        setIsGenerateModalOpen(true);
    };

    const handleBulkGenerate = async () => {
        if (!selectedJobId || !selectedExam) {
            toast.error("Please select a job post");
            return;
        }

        setGenerating(true);
        try {
            const { data, error } = await supabase.functions.invoke("generate-exam-questions", {
                body: {
                    jobId: selectedJobId,
                    masterExamId: selectedExam.id,
                    examName: selectedExam.name,
                    count: selectedExam.total_questions
                }
            });

            if (error) throw error;
            toast.success(`Successfully generated ${selectedExam.total_questions} questions!`);
            setIsGenerateModalOpen(false);
            navigate(`/admin/govt-jobs/${selectedJobId}/questions`);
        } catch (error: any) {
            console.error("Generation error:", error);
            toast.error(error.message || "Failed to generate question set");
        } finally {
            setGenerating(false);
        }
    };

    const filteredExams = exams.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderExamTable = (examList: MasterExam[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {examList.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No exams found in this category
                        </TableCell>
                    </TableRow>
                ) : (
                    examList.map((exam) => (
                        <TableRow key={exam.id}>
                            <TableCell className="font-medium">{exam.name}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5">
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                    {exam.total_questions}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    {exam.time_minutes} min
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 border-accent text-accent hover:bg-accent hover:text-white"
                                        onClick={() => handleGenerateClick(exam)}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Generate Set
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Exam Library</h1>
                        <p className="text-muted-foreground">Manage exam patterns and generate practice sets category-wise</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" /> Add Exam Pattern
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Exam Pattern</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Exam Name</Label>
                                        <Input
                                            placeholder="e.g. SSC CGL 2026"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Input
                                            placeholder="e.g. SSC, Banking, Railways"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Total Questions</Label>
                                            <Input
                                                type="number"
                                                value={formData.total_questions}
                                                onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Time (Minutes)</Label>
                                            <Input
                                                type="number"
                                                value={formData.time_minutes}
                                                onChange={(e) => setFormData({ ...formData, time_minutes: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddExam}>Save to Library</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search exams..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="bg-muted/50 p-1">
                            <TabsTrigger value="all">All Exams</TabsTrigger>
                            {categories.map(cat => (
                                <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value="all" className="mt-6">
                            <Card>
                                <CardContent className="pt-6">
                                    {renderExamTable(filteredExams)}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        {categories.map(cat => (
                            <TabsContent key={cat} value={cat} className="mt-6">
                                <Card>
                                    <CardContent className="pt-6">
                                        {renderExamTable(filteredExams.filter(e => e.category === cat))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </div>

            {/* Generation Modal */}
            <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-accent" />
                            Generate Practice Set
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                            <p className="text-sm font-medium">Exam Pattern: <span className="text-accent">{selectedExam?.name}</span></p>
                            <p className="text-xs text-muted-foreground mt-1">This will generate {selectedExam?.total_questions} questions based on the pattern.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Job Post</Label>
                            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a job post to link..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {jobs.map(job => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {job.post_name} ({job.organization})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground italic">The generated questions will be visible in the preparation section of this job post.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsGenerateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkGenerate} disabled={generating || !selectedJobId}>
                            {generating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Qs...
                                </>
                            ) : (
                                "Start Generation"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AdminExams;
