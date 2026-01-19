import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Edit, Trash2, Plus, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const AdminBlogs = () => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

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

    return (
        <div className="flex h-screen bg-gray-50/50">
            <AdminSidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
                            <p className="text-muted-foreground mt-2">
                                Manage your blog content and publications
                            </p>
                        </div>
                        <Link to="/admin/blogs/new">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Post
                            </Button>
                        </Link>
                    </div>

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
            </div>
        </div>
    );
};

export default AdminBlogs;
