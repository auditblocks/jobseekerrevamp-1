import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/FooterSection";
import { Helmet } from "react-helmet-async";
import { Loader2, ArrowLeft, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const BlogDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) {
            fetchBlog();
        }
    }, [slug]);

    const fetchBlog = async () => {
        try {
            const { data, error } = await supabase
                .from("blogs" as any)
                .select("*")
                .or(`slug.eq.${slug},slug.eq./blog/${slug},slug.eq./${slug}`)
                .eq("status", "published")
                .single();

            if (error) throw error;
            setBlog(data);
        } catch (error) {
            console.error("Error fetching blog:", error);
            navigate("/404"); // Redirect to 404 if not found
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!blog) return null;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Helmet>
                <title>{blog.meta_title || blog.title} | JobSeeker Blog</title>
                <meta
                    name="description"
                    content={blog.meta_description || blog.short_description}
                />
                {blog.focus_keyword && <meta name="keywords" content={blog.focus_keyword} />}
                <meta property="og:title" content={blog.meta_title || blog.title} />
                <meta property="og:description" content={blog.meta_description || blog.short_description} />
                {blog.featured_image_url && <meta property="og:image" content={blog.featured_image_url} />}
                <meta property="og:type" content="article" />
                <meta property="article:published_time" content={blog.published_at} />
                {blog.updated_at && <meta property="article:modified_time" content={blog.updated_at} />}
                <meta property="article:author" content={blog.author || "JobSeeker"} />
                <link rel="canonical" href={`https://startworking.in/blog/${blog.slug}`} />
            </Helmet>

            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
                <article className="max-w-3xl mx-auto">
                    <Button
                        variant="ghost"
                        className="mb-8 pl-0 hover:pl-2 transition-all gap-2"
                        onClick={() => navigate("/blog")}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Blog
                    </Button>

                    <header className="mb-10">
                        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6 text-foreground">
                            {blog.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-muted-foreground text-sm md:text-base border-b pb-8">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(blog.published_at), "MMMM d, yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{blog.author || "JobSeeker Team"}</span>
                            </div>
                        </div>
                    </header>

                    {blog.featured_image_url && (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden mb-12 shadow-md">
                            <img
                                src={blog.featured_image_url}
                                alt={blog.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div
                        className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-accent prose-img:rounded-xl"
                        dangerouslySetInnerHTML={{ __html: blog.content }}
                    />
                </article>
            </main>

            <Footer />
        </div>
    );
};

export default BlogDetail;
