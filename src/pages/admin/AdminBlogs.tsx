/**
 * @fileoverview Admin Blog listing page — displays all blog posts in a
 * searchable table with edit/delete/view actions. Also provides an
 * AI-powered draft generation dialog that invokes the `generate-blog-post`
 * Edge Function with configurable topic, focus keyword, hero image, and
 * publish mode.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Plus, Search, Eye, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";

/**
 * Admin blog management page. Lists all posts with status badges,
 * search filtering, and per-row actions (view published, edit, delete).
 * Includes an AI generation dialog for creating draft posts.
 * @returns {JSX.Element}
 */
const AdminBlogs = () => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const [generateOpen, setGenerateOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genTopic, setGenTopic] = useState("");
    const [genFocusKeyword, setGenFocusKeyword] = useState("");
    const [genImageMode, setGenImageMode] = useState<"stock" | "none">("stock");
    const [genPublishMode, setGenPublishMode] = useState<"draft" | "published">("draft");

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const { data, error } = await supabase
                .from("blogs" as any)
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setBlogs(data || []);
        } catch (error) {
            console.error("Error fetching blogs:", error);
            toast.error("Failed to fetch blogs");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this blog post?")) return;

        try {
            const { error } = await supabase.from("blogs" as any).delete().eq("id", id);
            if (error) throw error;

            setBlogs(blogs.filter((blog) => blog.id !== id));
            toast.success("Blog deleted successfully");
        } catch (error) {
            console.error("Error deleting blog:", error);
            toast.error("Failed to delete blog");
        }
    };

    const filteredBlogs = blogs.filter((blog) =>
        blog.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /**
     * Calls the `generate-blog-post` Edge Function, then navigates to the
     * editor for the newly created draft. Handles nested error extraction
     * from the function's response context.
     */
    const handleGenerateDraft = async () => {
        const topic = genTopic.trim();
        if (!topic) {
            toast.error("Enter a topic");
            return;
        }
        setGenerating(true);
        try {
            const body: Record<string, string> = {
                topic,
                image_mode: genImageMode,
                publish_mode: genPublishMode,
            };
            const fk = genFocusKeyword.trim();
            if (fk) body.focus_keyword = fk;

            const { data, error } = await supabase.functions.invoke("generate-blog-post", { body });

            if (error) {
                let msg = error.message || "Generation failed";
                const ctx = (error as { context?: { body?: unknown } }).context;
                if (ctx?.body) {
                    try {
                        const b =
                            typeof ctx.body === "string" ? JSON.parse(ctx.body) : (ctx.body as Record<string, unknown>);
                        if (typeof b?.message === "string") msg = b.message;
                        else if (typeof b?.error === "string") msg = b.error;
                    } catch {
                        /* keep msg */
                    }
                }
                throw new Error(msg);
            }

            if (!data?.success) {
                throw new Error(data?.message || "Generation failed");
            }

            const id = data?.data?.id as string | undefined;
            if (!id) throw new Error("No post id returned");

            toast.success("Draft created — opening editor");
            setGenerateOpen(false);
            setGenTopic("");
            setGenFocusKeyword("");
            setGenImageMode("stock");
            setGenPublishMode("draft");
            await fetchBlogs();
            navigate(`/admin/blogs/${id}`);
        } catch (e: unknown) {
            console.error("generate-blog-post:", e);
            const msg = e instanceof Error ? e.message : "Failed to generate draft";
            toast.error(msg);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your blog content and publications
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => setGenerateOpen(true)}>
                            <Sparkles className="w-4 h-4" />
                            Generate draft
                        </Button>
                        <Link to="/admin/blogs/new">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Post
                            </Button>
                        </Link>
                    </div>
                </div>

                <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Generate blog draft</DialogTitle>
                            <DialogDescription>
                                Uses AI to create a draft (with optional stock hero image). Review and edit before
                                publishing.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="gen-topic">Topic</Label>
                                <Input
                                    id="gen-topic"
                                    placeholder="e.g. How to prepare for SSC CGL in 6 months"
                                    value={genTopic}
                                    onChange={(e) => setGenTopic(e.target.value)}
                                    disabled={generating}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="gen-focus">Focus keyword (optional)</Label>
                                <Input
                                    id="gen-focus"
                                    placeholder="SEO focus phrase"
                                    value={genFocusKeyword}
                                    onChange={(e) => setGenFocusKeyword(e.target.value)}
                                    disabled={generating}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Hero image</Label>
                                <Select
                                    value={genImageMode}
                                    onValueChange={(v) => setGenImageMode(v as "stock" | "none")}
                                    disabled={generating}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="stock">Stock photo (Pexels / Unsplash)</SelectItem>
                                        <SelectItem value="none">No image</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={genPublishMode}
                                    onValueChange={(v) => setGenPublishMode(v as "draft" | "published")}
                                    disabled={generating}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft (recommended)</SelectItem>
                                        <SelectItem value="published">Publish immediately</SelectItem>
                                    </SelectContent>
                                </Select>
                                {genPublishMode === "published" && (
                                    <p className="text-xs text-amber-700">
                                        Published posts are public. Confirm content is accurate before choosing this.
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setGenerateOpen(false)} disabled={generating}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerateDraft} disabled={generating}>
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Generating…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search posts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Published On</TableHead>
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
                                ) : filteredBlogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No blog posts found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBlogs.map((blog) => (
                                        <TableRow key={blog.id}>
                                            <TableCell className="font-medium">
                                                {blog.title}
                                                <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                    /{blog.slug}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={blog.status === "published" ? "default" : "secondary"}
                                                    className="bg-opacity-10 text-xs px-2 py-0.5 rounded-full capitalize"
                                                >
                                                    {blog.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{blog.author || "-"}</TableCell>
                                            <TableCell>
                                                {blog.published_at
                                                    ? format(new Date(blog.published_at), "MMM d, yyyy")
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {blog.status === 'published' && (
                                                        <a
                                                            href={`/blog/${blog.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Button variant="ghost" size="icon">
                                                                <Eye className="w-4 h-4 text-muted-foreground" />
                                                            </Button>
                                                        </a>
                                                    )}
                                                    <Link to={`/admin/blogs/${blog.id}`}>
                                                        <Button variant="ghost" size="icon">
                                                            <Edit className="w-4 h-4 text-blue-500" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(blog.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
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

export default AdminBlogs;
