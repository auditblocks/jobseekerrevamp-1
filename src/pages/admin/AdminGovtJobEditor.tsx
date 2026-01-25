import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Globe, Search, Type, PenLine, Settings, MapPin } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X as CloseIcon, Tag } from "lucide-react";

const AdminGovtJobEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id && id !== "new";
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("content");

    // Form State
    const [formData, setFormData] = useState({
        organization: "",
        post_name: "",
        slug: "",
        summary: "",
        exam_name: "",
        advertisement_no: "",
        official_website: "",
        apply_url: "",
        location: "India",
        application_start_date: "",
        application_end_date: "",
        application_fee: "",
        mode_of_apply: "Online",
        description: "",
        visibility: "free",
        status: "active",
        meta_title: "",
        meta_description: "",
        job_posting_json: null,
        tags: [] as string[],
    });

    const [tagInput, setTagInput] = useState("");

    useEffect(() => {
        if (isEditing) {
            fetchJob();
        }
    }, [id]);

    const fetchJob = async () => {
        try {
            const { data, error } = await supabase
                .from("govt_jobs" as any)
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;

            const jobData = data as any;
            // Format dates for input[type="date"]
            const formattedData = {
                ...jobData,
                application_start_date: jobData.application_start_date ? jobData.application_start_date.split('T')[0] : "",
                application_end_date: jobData.application_end_date ? jobData.application_end_date.split('T')[0] : "",
                meta_title: jobData.meta_title || "",
                meta_description: jobData.meta_description || "",
                summary: jobData.summary || "",
                location: jobData.location || "India",
                slug: jobData.slug || "",
                tags: jobData.tags || [],
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

    const generateSlug = () => {
        if (!formData.post_name) {
            toast.error("Enter job title first");
            return;
        }
        const base = `${formData.post_name}-${formData.organization}`;
        const slug = base
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        handleChange("slug", `${slug}-${Date.now().toString().slice(-4)}`);
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
                slug: formData.slug || undefined, // Let trigger handle it if empty
            };

            if (isEditing) {
                const { error } = await supabase
                    .from("govt_jobs" as any)
                    .update(payload)
                    .eq("id", id);
                if (error) throw error;
                toast.success("Job updated successfully");
            } else {
                const { error } = await supabase
                    .from("govt_jobs" as any)
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
                <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate("/admin/govt-jobs")}
                                className="rounded-full"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {isEditing ? `Edit: ${formData.post_name}` : "New Govt. Job"}
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Manage job posting details, SEO, and visibility
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Button type="submit" disabled={saving} className="w-full md:w-auto gap-2 px-6 h-11" variant="accent">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save Posting
                            </Button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-muted/50 p-1 rounded-xl">
                            <TabsTrigger value="content" className="gap-2 rounded-lg data-[state=active]:bg-white">
                                <PenLine className="h-4 w-4" /> Content Details
                            </TabsTrigger>
                            <TabsTrigger value="seo" className="gap-2 rounded-lg data-[state=active]:bg-white">
                                <Search className="h-4 w-4" /> SEO & Meta
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:bg-white">
                                <Settings className="h-4 w-4" /> Settings
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="content" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold">Organization / Department</Label>
                                                <Input
                                                    required
                                                    value={formData.organization}
                                                    onChange={(e) => handleChange("organization", e.target.value)}
                                                    placeholder="e.g. UPSC, SSC, Banking"
                                                    className="h-11 border-border/60"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold">Post Name / Title</Label>
                                                <Input
                                                    required
                                                    value={formData.post_name}
                                                    onChange={(e) => handleChange("post_name", e.target.value)}
                                                    placeholder="e.g. Inspector, Assistant Manager"
                                                    className="h-11 border-border/60"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold flex justify-between">
                                                Job Slug (URL)
                                                <span onClick={generateSlug} className="text-[10px] text-accent font-bold cursor-pointer hover:underline">Auto Generate</span>
                                            </Label>
                                            <div className="flex gap-2">
                                                <div className="bg-muted h-11 px-3 flex items-center rounded-lg text-xs text-muted-foreground border shrink-0">
                                                    /government-jobs/
                                                </div>
                                                <Input
                                                    required
                                                    value={formData.slug}
                                                    onChange={(e) => handleChange("slug", e.target.value)}
                                                    placeholder="ssc-cgl-recruitment-2024"
                                                    className="h-11 border-border/60"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold regular">Short Summary (SEO Snippet)</Label>
                                            <Textarea
                                                value={formData.summary}
                                                onChange={(e) => handleChange("summary", e.target.value)}
                                                placeholder="Brief overview of the recruitment for listing page cards and SEO..."
                                                className="min-h-[80px] border-border/60 resize-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold">Full Job Description & Eligibility</Label>
                                            <div className="prose-editor min-h-[500px] mb-4">
                                                <ReactQuill
                                                    theme="snow"
                                                    value={formData.description}
                                                    onChange={(value) => handleChange("description", value)}
                                                    className="h-[430px]"
                                                    formats={[
                                                        'header', 'bold', 'italic', 'underline', 'strike',
                                                        'list', 'bullet', 'indent', 'link', 'table'
                                                    ]}
                                                    modules={{
                                                        toolbar: [
                                                            [{ 'header': [1, 2, 3, false] }],
                                                            ['bold', 'italic', 'underline', 'strike'],
                                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                            [{ 'indent': '-1' }, { 'indent': '+1' }],
                                                            ['link', 'table'],
                                                            ['clean']
                                                        ],
                                                        clipboard: {
                                                            matchVisual: false,
                                                        },
                                                    }}
                                                />
                                                <div className="mb-12" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                                        <h3 className="font-bold flex items-center gap-2 border-b pb-4">
                                            <MapPin className="h-4 w-4 text-accent" /> Posting Details
                                        </h3>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Job Location</Label>
                                            <Input
                                                value={formData.location}
                                                onChange={(e) => handleChange("location", e.target.value)}
                                                placeholder="e.g. New Delhi, All India"
                                                className="h-10 border-border/60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Exam Name (Optional)</Label>
                                            <Input
                                                value={formData.exam_name}
                                                onChange={(e) => handleChange("exam_name", e.target.value)}
                                                placeholder="e.g. CGL 2024"
                                                className="h-10 border-border/60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Advertisement No.</Label>
                                            <Input
                                                value={formData.advertisement_no}
                                                onChange={(e) => handleChange("advertisement_no", e.target.value)}
                                                placeholder="e.g. 01/2024-UPSC"
                                                className="h-10 border-border/60"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                                        <h3 className="font-bold flex items-center gap-2 border-b pb-4">
                                            <Tag className="h-4 w-4 text-accent" /> Opportunity Tags
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex gap-2">
                                                <Input
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const tag = tagInput.trim();
                                                            if (tag && !formData.tags.includes(tag)) {
                                                                handleChange("tags", [...formData.tags, tag]);
                                                                setTagInput("");
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Add tag (Press Enter)..."
                                                    className="h-10 border-border/60"
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        const tag = tagInput.trim();
                                                        if (tag && !formData.tags.includes(tag)) {
                                                            handleChange("tags", [...formData.tags, tag]);
                                                            setTagInput("");
                                                        }
                                                    }}
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.tags.map((tag, i) => (
                                                    <Badge key={i} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                                                        {tag}
                                                        <span
                                                            className="hover:bg-muted-foreground/20 rounded-full p-0.5 cursor-pointer"
                                                            onClick={() => handleChange("tags", formData.tags.filter(t => t !== tag))}
                                                        >
                                                            <CloseIcon className="h-3 w-3" />
                                                        </span>
                                                    </Badge>
                                                ))}
                                                {formData.tags.length === 0 && (
                                                    <p className="text-[10px] text-muted-foreground italic">No tags added (e.g. IAS, Banking, Graduate)</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                                        <h3 className="font-bold flex items-center gap-2 border-b pb-4">
                                            <Globe className="h-4 w-4 text-accent" /> Links & Fee
                                        </h3>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Apply URL</Label>
                                            <Input
                                                value={formData.apply_url}
                                                onChange={(e) => handleChange("apply_url", e.target.value)}
                                                placeholder="Registration link..."
                                                className="h-10 border-border/60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Official Website</Label>
                                            <Input
                                                value={formData.official_website}
                                                onChange={(e) => handleChange("official_website", e.target.value)}
                                                placeholder="https://upsc.gov.in"
                                                className="h-10 border-border/60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Application Fee</Label>
                                            <Input
                                                value={formData.application_fee}
                                                onChange={(e) => handleChange("application_fee", e.target.value)}
                                                placeholder="e.g. ₹100 for General"
                                                className="h-10 border-border/60"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="seo" className="space-y-6">
                            <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-8 max-w-3xl">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold">SEO/Meta Title</Label>
                                    <Input
                                        value={formData.meta_title}
                                        onChange={(e) => handleChange("meta_title", e.target.value)}
                                        placeholder="Title for Google Search (60 chars recommended)"
                                        className="h-12 border-border/60"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Appears in browser tab and Google search results.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold">SEO/Meta Description</Label>
                                    <Textarea
                                        value={formData.meta_description}
                                        onChange={(e) => handleChange("meta_description", e.target.value)}
                                        placeholder="Description for Google Search (160 chars recommended)"
                                        className="min-h-[120px] border-border/60 resize-none py-3"
                                    />
                                    <p className="text-[10px] text-muted-foreground">The short snippet that appears under the title in search results.</p>
                                </div>

                                <div className="p-6 rounded-xl bg-muted/30 space-y-4 border border-border/50">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-success" /> Google Search Preview
                                    </h4>
                                    <div className="bg-white p-5 rounded-lg border shadow-sm space-y-1">
                                        <div className="text-blue-700 text-lg hover:underline cursor-pointer truncate max-w-md">
                                            {formData.meta_title || (formData.post_name + " - " + formData.organization)}
                                        </div>
                                        <div className="text-green-800 text-xs truncate">
                                            https://startworking.in/government-jobs/{formData.slug || "example-job"}
                                        </div>
                                        <div className="text-muted-foreground text-xs line-clamp-2 mt-1 leading-relaxed">
                                            {formData.meta_description || formData.summary || "Browse the latest government job notifications, application dates, and eligibility criteria on JobSeeker."}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                                <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                                    <h3 className="font-bold border-b pb-4">Deadlines</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Application Start</Label>
                                            <Input
                                                type="date"
                                                value={formData.application_start_date}
                                                onChange={(e) => handleChange("application_start_date", e.target.value)}
                                                className="border-border/60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight">Application End</Label>
                                            <Input
                                                type="date"
                                                value={formData.application_end_date}
                                                onChange={(e) => handleChange("application_end_date", e.target.value)}
                                                className="border-border/60"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <Label className="text-xs font-bold uppercase tracking-tight">Application Mode</Label>
                                        <Select
                                            value={formData.mode_of_apply}
                                            onValueChange={(val) => handleChange("mode_of_apply", val)}
                                        >
                                            <SelectTrigger className="h-10 border-border/60"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Online">Online</SelectItem>
                                                <SelectItem value="Offline">Offline</SelectItem>
                                                <SelectItem value="Both">Both</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                                    <h3 className="font-bold border-b pb-4">Tiers & Visibility</h3>
                                    <div className="space-y-6 pt-2">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold cursor-pointer" htmlFor="premium-toggle">Premium Job Posting</Label>
                                                <p className="text-[10px] text-muted-foreground">Only visible to PRO/PRO_MAX subscribers</p>
                                            </div>
                                            <Switch
                                                id="premium-toggle"
                                                checked={formData.visibility === "premium"}
                                                onCheckedChange={(checked) =>
                                                    handleChange("visibility", checked ? "premium" : "free")
                                                }
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold cursor-pointer" htmlFor="active-toggle">Published Status</Label>
                                                <p className="text-[10px] text-muted-foreground">Active jobs appear in public listings</p>
                                            </div>
                                            <Switch
                                                id="active-toggle"
                                                checked={formData.status === "active"}
                                                onCheckedChange={(checked) =>
                                                    handleChange("status", checked ? "active" : "expired")
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </form>
            </div>
        </AdminLayout>
    );
};

export default AdminGovtJobEditor;
