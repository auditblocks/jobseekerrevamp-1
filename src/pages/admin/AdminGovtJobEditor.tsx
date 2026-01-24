import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Calendar as CalendarIcon } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminGovtJobEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id && id !== "new";
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        organization: "",
        post_name: "",
        exam_name: "",
        advertisement_no: "",
        official_website: "",
        apply_url: "",
        application_start_date: "",
        application_end_date: "",
        application_fee: "",
        mode_of_apply: "Online",
        description: "",
        visibility: "free",
        status: "active",
    });

    useEffect(() => {
        if (isEditing) {
            fetchJob();
        }
    }, [id]);

    const fetchJob = async () => {
        try {
            const { data, error } = await supabase
                .from("govt_jobs")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;

            // Format dates for input[type="date"]
            const formattedData = {
                ...data,
                application_start_date: data.application_start_date ? data.application_start_date.split('T')[0] : "",
                application_end_date: data.application_end_date ? data.application_end_date.split('T')[0] : "",
            };
            setFormData(formattedData);
        } catch (error) {
            console.error("Error fetching job:", error);
            toast.error("Failed to fetch job details");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                ...formData,
                application_start_date: formData.application_start_date || null,
                application_end_date: formData.application_end_date || null,
                updated_at: new Date().toISOString(),
            };

            if (isEditing) {
                const { error } = await supabase
                    .from("govt_jobs")
                    .update(payload)
                    .eq("id", id);
                if (error) throw error;
                toast.success("Job updated successfully");
            } else {
                const { error } = await supabase
                    .from("govt_jobs")
                    .insert([payload]);
                if (error) throw error;
                toast.success("Job created successfully");
                navigate("/admin/govt-jobs");
            }
        } catch (error: any) {
            console.error("Error saving job:", error);
            toast.error(error.message || "Failed to save job");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <AdminLayout>
            <div className="overflow-auto pb-12">
                <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate("/admin/govt-jobs")}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {isEditing ? "Edit Govt. Job" : "New Govt. Job"}
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    Fill in the details for the government job posting
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button type="submit" disabled={saving} className="gap-2">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save Posting
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Organization / Department</Label>
                                        <Input
                                            required
                                            value={formData.organization}
                                            onChange={(e) => handleChange("organization", e.target.value)}
                                            placeholder="e.g. UPSC, SSC, Banking"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Post Name</Label>
                                        <Input
                                            required
                                            value={formData.post_name}
                                            onChange={(e) => handleChange("post_name", e.target.value)}
                                            placeholder="e.g. Inspector, Assistant Manager"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Exam Name (Optional)</Label>
                                    <Input
                                        value={formData.exam_name}
                                        onChange={(e) => handleChange("exam_name", e.target.value)}
                                        placeholder="e.g. CGL 2024, Civil Services Exam"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Job Description & Full Details</Label>
                                    <div className="prose-editor min-h-[400px] mb-12 bg-white">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.description}
                                            onChange={(value) => handleChange("description", value)}
                                            className="h-[350px]"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, false] }],
                                                    ['bold', 'italic', 'underline', 'strike'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    ['link'],
                                                    ['clean']
                                                ],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Settings */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <h3 className="font-semibold mb-2">Application Info</h3>
                                <div className="space-y-2">
                                    <Label>Mode of Apply</Label>
                                    <Select
                                        value={formData.mode_of_apply}
                                        onValueChange={(val) => handleChange("mode_of_apply", val)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Online">Online</SelectItem>
                                            <SelectItem value="Offline">Offline</SelectItem>
                                            <SelectItem value="Both">Both</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Application Fee</Label>
                                    <Input
                                        value={formData.application_fee}
                                        onChange={(e) => handleChange("application_fee", e.target.value)}
                                        placeholder="e.g. ₹100 for Gen, Free for ST/SC"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Official Website</Label>
                                    <Input
                                        value={formData.official_website}
                                        onChange={(e) => handleChange("official_website", e.target.value)}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Apply URL</Label>
                                    <Input
                                        value={formData.apply_url}
                                        onChange={(e) => handleChange("apply_url", e.target.value)}
                                        placeholder="Direct link to registration"
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <h3 className="font-semibold mb-2">Deadlines & Visibility</h3>
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.application_start_date}
                                        onChange={(e) => handleChange("application_start_date", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.application_end_date}
                                        onChange={(e) => handleChange("application_end_date", e.target.value)}
                                    />
                                </div>
                                <div className="pt-4 border-t space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Premium Visibility</Label>
                                        <Switch
                                            checked={formData.visibility === "premium"}
                                            onCheckedChange={(checked) =>
                                                handleChange("visibility", checked ? "premium" : "free")
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Active Status</Label>
                                        <Switch
                                            checked={formData.status === "active"}
                                            onCheckedChange={(checked) =>
                                                handleChange("status", checked ? "active" : "expired")
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default AdminGovtJobEditor;
