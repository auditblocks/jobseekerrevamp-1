import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    Download,
    Plus,
    Trash2,
    Edit2,
    Loader2,
    Filter,
    Search,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreVertical,
    Briefcase
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/DashboardLayout";

interface TrackedJob {
    id: string;
    organization: string;
    post_name: string;
    application_status: string;
    payment_status: string;
    admit_card_status: string;
    exam_date: string | null;
    result_status: string;
    created_at: string;
}

const GovtJobTracker = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) fetchTrackedJobs();
    }, [user]);

    const fetchTrackedJobs = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("job_tracker" as any)
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTrackedJobs((data as unknown as TrackedJob[]) || []);
        } catch (error) {
            console.error("Error fetching tracked jobs:", error);
            toast.error("Failed to load your tracker");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this job from your tracker?")) return;

        try {
            const { error } = await supabase.from("job_tracker" as any).delete().eq("id", id);
            if (error) throw error;
            setTrackedJobs(jobs => jobs.filter(j => j.id !== id));
            toast.success("Job removed from tracker");
        } catch (error) {
            console.error("Error deleting job:", error);
            toast.error("Failed to remove job");
        }
    };

    const handleUpdateStatus = async (jobId: string, updates: any) => {
        try {
            const { error } = await supabase
                .from("job_tracker" as any)
                .update(updates)
                .eq("id", jobId);

            if (error) throw error;
            setTrackedJobs(jobs => jobs.map(j => j.id === jobId ? { ...j, ...updates } : j));
            toast.success("Status updated");
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleExportCSV = () => {
        if (trackedJobs.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = ["Organization", "Post Name", "Application Status", "Payment Status", "Admit Card Status", "Exam Date", "Result Status", "Tracked Date"];
        const rows = trackedJobs.map(j => [
            j.organization,
            j.post_name,
            j.application_status,
            j.payment_status,
            j.admit_card_status,
            j.exam_date ? format(new Date(j.exam_date), 'yyyy-MM-dd') : 'N/A',
            j.result_status,
            format(new Date(j.created_at), 'yyyy-MM-dd')
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers, ...rows].map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `govt_job_tracker_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'applied':
            case 'paid':
            case 'qualified':
                return 'bg-success/10 text-success border-success/20';
            case 'not applied':
            case 'pending':
            case 'failed':
                return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'in progress':
            case 'awaiting':
                return 'bg-warning/10 text-warning border-warning/20';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const handleSaveEdit = async () => {
        if (!editingJob) return;
        try {
            setIsSaving(true);
            const { error } = await supabase
                .from("job_tracker" as any)
                .update(editingJob)
                .eq("id", editingJob.id);

            if (error) throw error;
            setTrackedJobs(jobs => jobs.map(j => j.id === editingJob.id ? { ...j, ...editingJob } : j));
            setIsEditDialogOpen(false);
            toast.success("Job tracker updated");
        } catch (error) {
            console.error("Error saving edit:", error);
            toast.error("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredJobs = trackedJobs.filter(j =>
        j.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.post_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <Helmet>
                <title>My Job Tracker | JobSeeker</title>
            </Helmet>

            <div className="container mx-auto px-4 pt-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold">Job Tracker</h1>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Total Jobs</p>
                                <p className="text-2xl font-bold">{trackedJobs.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Applied</p>
                                <p className="text-2xl font-bold text-success">
                                    {trackedJobs.filter(j => j.application_status.toLowerCase() === 'applied').length}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Upcoming Exams</p>
                                <p className="text-2xl font-bold text-accent">
                                    {trackedJobs.filter(j => j.exam_date && new Date(j.exam_date) > new Date()).length}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Success Rate</p>
                                <p className="text-2xl font-bold text-warning">--</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter your tracker..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-accent" />
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="text-center py-20 border rounded-2xl bg-card/50">
                            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <p className="text-muted-foreground">You haven't added any jobs to your tracker yet.</p>
                            <Button variant="link" onClick={() => navigate("/government-jobs")} className="mt-2 text-accent">
                                Browse Govt. Jobs
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 border-b border-border">
                                            <th className="p-4 font-semibold text-sm">Job Details</th>
                                            <th className="p-4 font-semibold text-sm">App. Status</th>
                                            <th className="p-4 font-semibold text-sm">Payment</th>
                                            <th className="p-4 font-semibold text-sm">Admit Card</th>
                                            <th className="p-4 font-semibold text-sm">Exam Date</th>
                                            <th className="p-4 font-semibold text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {filteredJobs.map((job) => (
                                                <motion.tr
                                                    key={job.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                                                >
                                                    <td className="p-4">
                                                        <p className="font-bold text-foreground text-sm leading-tight">{job.post_name}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{job.organization}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <Select
                                                            defaultValue={job.application_status}
                                                            onValueChange={(val) => handleUpdateStatus(job.id, { application_status: val })}
                                                        >
                                                            <SelectTrigger className={`w-[130px] h-8 text-xs ${getStatusColor(job.application_status)}`}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Not Applied">Not Applied</SelectItem>
                                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                                <SelectItem value="Applied">Applied</SelectItem>
                                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-4">
                                                        <Select
                                                            defaultValue={job.payment_status}
                                                            onValueChange={(val) => handleUpdateStatus(job.id, { payment_status: val })}
                                                        >
                                                            <SelectTrigger className={`w-[120px] h-8 text-xs ${getStatusColor(job.payment_status)}`}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Pending">Pending</SelectItem>
                                                                <SelectItem value="Paid">Paid</SelectItem>
                                                                <SelectItem value="Failed">Failed</SelectItem>
                                                                <SelectItem value="Refunded">Refunded</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-4">
                                                        <Badge variant="outline" className={`font-normal text-[10px] ${getStatusColor(job.admit_card_status)}`}>
                                                            {job.admit_card_status}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4 text-sm whitespace-nowrap">
                                                        {job.exam_date ? format(new Date(job.exam_date), 'MMM dd, yyyy') : '--'}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-accent"
                                                                onClick={() => {
                                                                    setEditingJob(job);
                                                                    setIsEditDialogOpen(true);
                                                                }}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleDelete(job.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Tracker Entry</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Organization</Label>
                                <Input
                                    value={editingJob?.organization || ""}
                                    onChange={(e) => setEditingJob({ ...editingJob, organization: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Post Name</Label>
                                <Input
                                    value={editingJob?.post_name || ""}
                                    onChange={(e) => setEditingJob({ ...editingJob, post_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Application Status</Label>
                                <Select
                                    value={editingJob?.application_status}
                                    onValueChange={(val) => setEditingJob({ ...editingJob, application_status: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Not Applied">Not Applied</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Applied">Applied</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Status</Label>
                                <Select
                                    value={editingJob?.payment_status}
                                    onValueChange={(val) => setEditingJob({ ...editingJob, payment_status: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Paid">Paid</SelectItem>
                                        <SelectItem value="Failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Result Status</Label>
                                <Select
                                    value={editingJob?.result_status}
                                    onValueChange={(val) => setEditingJob({ ...editingJob, result_status: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Awaiting">Awaiting</SelectItem>
                                        <SelectItem value="Qualified">Qualified</SelectItem>
                                        <SelectItem value="Not Qualified">Not Qualified</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes / Remarks</Label>
                            <Input
                                value={editingJob?.notes || ""}
                                placeholder="Registration number, Login password, etc."
                                onChange={(e) => setEditingJob({ ...editingJob, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving} className="gap-2">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default GovtJobTracker;
