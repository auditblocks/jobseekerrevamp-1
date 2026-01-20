import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Upload } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { compressImage } from "@/lib/image-compression";
import { useRef } from "react";

const AdminBlogEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id && id !== "new";
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        short_description: "",
        content: "",
        featured_image_url: "",
        meta_title: "",
        meta_description: "",
        focus_keyword: "",
        status: "draft",
        author: "",
        published_at: null as string | null,
    });

    useEffect(() => {
        if (isEditing) {
            fetchBlog();
        }
    }, [id]);

    const fetchBlog = async () => {
        try {
            const { data, error } = await supabase
                .from("blogs" as any)
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            setFormData(data);
        } catch (error) {
            console.error("Error fetching blog:", error);
            toast.error("Failed to fetch blog details");
        } finally {
            setLoading(false);
        }
    };

    const handleSlugGeneration = (title: string) => {
        if (!formData.slug || !isEditing) {
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
            setFormData((prev) => ({ ...prev, slug, title }));
        } else {
            setFormData((prev) => ({ ...prev, title }));
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            // Compress image before upload
            const compressedFile = await compressImage(file);

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, compressedFile);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('blog-images')
                .getPublicUrl(filePath);

            handleChange("featured_image_url", publicUrl);
            toast.success("Image uploaded successfully");
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error(error.message || "Failed to upload image");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const cleanSlug = (formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
                .replace(/^\/+/, "") // Remove leading slashes
                .replace(/^blog\//, "") // Remove 'blog/' prefix if exists
                .replace(/^\/+/, ""); // Remove any remaining leading slashes

            const payload = {
                ...formData,
                slug: cleanSlug,
                updated_at: new Date().toISOString(),
                published_at: formData.status === 'published' && !formData.published_at
                    ? new Date().toISOString()
                    : formData.published_at
            };

            if (isEditing) {
                const { error } = await supabase
                    .from("blogs" as any)
                    .update(payload)
                    .eq("id", id);
                if (error) throw error;
                toast.success("Blog updated successfully");
            } else {
                const { error } = await supabase
                    .from("blogs" as any)
                    .insert([payload]);
                if (error) throw error;
                toast.success("Blog created successfully");
                navigate("/admin/blogs");
            }
        } catch (error: any) {
            console.error("Error saving blog:", error);
            toast.error(error.message || "Failed to save blog");
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
            <div className="overflow-auto">
                <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate("/admin/blogs")}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {isEditing ? "Edit Blog Post" : "New Blog Post"}
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    {formData.status === "published" ? "Published" : "Draft"}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border">
                                <Switch
                                    checked={formData.status === "published"}
                                    onCheckedChange={(checked) =>
                                        handleChange("status", checked ? "published" : "draft")
                                    }
                                />
                                <span className="text-sm font-medium">
                                    {formData.status === "published" ? "Published" : "Draft"}
                                </span>
                            </div>
                            <Button type="submit" disabled={saving} className="gap-2">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save Changes
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        required
                                        value={formData.title}
                                        onChange={(e) => handleSlugGeneration(e.target.value)}
                                        placeholder="Enter blog title"
                                        className="text-lg font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Slug</Label>
                                    <Input
                                        value={formData.slug}
                                        onChange={(e) => handleChange("slug", e.target.value)}
                                        placeholder="url-slug"
                                        className="font-mono text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Content</Label>
                                    <div className="prose-editor h-[500px] mb-12">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.content}
                                            onChange={(value) => handleChange("content", value)}
                                            className="h-[450px]"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, false] }],
                                                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                                    ['link', 'image'],
                                                    ['clean']
                                                ],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <h3 className="font-semibold text-lg">SEO Settings</h3>
                                <div className="space-y-2">
                                    <Label>Meta Title</Label>
                                    <Input
                                        value={formData.meta_title}
                                        onChange={(e) => handleChange("meta_title", e.target.value)}
                                        placeholder="SEO Title (60 chars)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Meta Description</Label>
                                    <Textarea
                                        value={formData.meta_description}
                                        onChange={(e) => handleChange("meta_description", e.target.value)}
                                        placeholder="SEO Description (160 chars)"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Focus Keyword</Label>
                                    <Input
                                        value={formData.focus_keyword}
                                        onChange={(e) => handleChange("focus_keyword", e.target.value)}
                                        placeholder="Primary keyword"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Settings */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <h3 className="font-semibold mb-2">Publishing</h3>
                                <div className="space-y-2">
                                    <Label>Author</Label>
                                    <Input
                                        value={formData.author}
                                        onChange={(e) => handleChange("author", e.target.value)}
                                        placeholder="Author Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Short Description</Label>
                                    <Textarea
                                        value={formData.short_description}
                                        onChange={(e) => handleChange("short_description", e.target.value)}
                                        placeholder="Excerpt for listing page"
                                        rows={4}
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <h3 className="font-semibold mb-2">Featured Image</h3>
                                <div className="space-y-2">
                                    <Label>Image URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.featured_image_url}
                                            onChange={(e) => handleChange("featured_image_url", e.target.value)}
                                            placeholder="https://..."
                                        />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            type="button"
                                            disabled={uploading}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {uploading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    {formData.featured_image_url && (
                                        <div className="mt-2 aspect-video rounded-md overflow-hidden bg-gray-100 relative">
                                            <img
                                                src={formData.featured_image_url}
                                                alt="Featured"
                                                className="object-cover w-full h-full"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default AdminBlogEditor;
