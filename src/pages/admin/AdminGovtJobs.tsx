import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Search, Building2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";

const AdminGovtJobs = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("govt_jobs")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            toast.error("Failed to fetch govt. jobs");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this job posting?")) return;

        try {
            const { error } = await supabase.from("govt_jobs").delete().eq("id", id);
            if (error) throw error;

            setJobs(jobs.filter((job) => job.id !== id));
            toast.success("Job deleted successfully");
        } catch (error) {
            console.error("Error deleting job:", error);
            toast.error("Failed to delete job");
        }
    };

    const filteredJobs = jobs.filter((job) =>
        job.post_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.organization.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Govt. Job Postings</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage government job alerts and portal content
                        </p>
                    </div>
                    <Link to="/admin/govt-jobs/new">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Job
                        </Button>
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-border p-6 overflow-hidden">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search jobs or organizations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Job Title & Organization</TableHead>
                                    <TableHead>Mode/Visibility</TableHead>
                                    <TableHead>Fee</TableHead>
                                    <TableHead>Deadlines</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredJobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No job postings found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredJobs.map((job) => (
                                        <TableRow key={job.id}>
                                            <TableCell className="max-w-[300px]">
                                                <div className="font-medium truncate">{job.post_name}</div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {job.organization}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit text-[10px] capitalize">
                                                        {job.mode_of_apply}
                                                    </Badge>
                                                    <Badge
                                                        variant={job.visibility === 'premium' ? 'accent' : 'secondary'}
                                                        className="w-fit text-[10px] uppercase"
                                                    >
                                                        {job.visibility}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {job.application_fee || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs space-y-1">
                                                    <p className="flex items-center gap-1">
                                                        <span className="text-muted-foreground w-12 italic">Starts:</span>
                                                        {job.application_start_date ? format(new Date(job.application_start_date), "MMM d") : "-"}
                                                    </p>
                                                    <p className="flex items-center gap-1 font-semibold">
                                                        <span className="text-muted-foreground w-12 italic font-normal">Ends:</span>
                                                        {job.application_end_date ? format(new Date(job.application_end_date), "MMM d, yyyy") : "-"}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link to={`/admin/govt-jobs/${job.id}`}>
                                                        <Button variant="ghost" size="icon">
                                                            <Edit className="w-4 h-4 text-accent" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(job.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminGovtJobs;
