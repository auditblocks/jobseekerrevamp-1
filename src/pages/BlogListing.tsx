import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/FooterSection";
import SEOHead from "@/pages/Index"; // Importing SEOHead structure if available or reusing Helmet
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";

const BlogListing = () => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const { data, error } = await supabase
                .from("blogs" as any)
                .select("*")
                .eq("status", "published")
                .order("published_at", { ascending: false });

            if (error) throw error;
            setBlogs(data || []);
        } catch (error) {
            console.error("Error fetching blogs:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Helmet>
                <title>Blog | JobSeeker - Career Insights & AI Tools</title>
                <meta
                    name="description"
                    content="Latest articles, guides, and insights on job search automation, AI tools, and career development."
                />
                <meta property="og:title" content="JobSeeker Blog" />
                <meta property="og:description" content="Latest articles, guides, and insights on job search automation, AI tools, and career development." />
                <link rel="canonical" href="https://startworking.in/blog" />
            </Helmet>

            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-16 md:py-24">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            The JobSeeker Blog
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Insights and strategies for your job search journey
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : blogs.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <p>No posts published yet. Check back soon!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {blogs.map((blog) => (
                                <Link
                                    to={`/blog/${blog.slug}`}
                                    key={blog.id}
                                    className="group flex flex-col bg-card rounded-2xl border hover:border-accent/50 transition-all duration-300 overflow-hidden hover:shadow-lg"
                                >
                                    <div className="aspect-video w-full bg-muted relative overflow-hidden">
                                        {blog.featured_image_url ? (
                                            <img
                                                src={blog.featured_image_url}
                                                alt={blog.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent/50">
                                                No Image
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                            <span>{format(new Date(blog.published_at), "MMM d, yyyy")}</span>
                                            <span>•</span>
                                            <span>{blog.author || "JobSeeker Team"}</span>
                                        </div>
                                        <h2 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors">
                                            {blog.title}
                                        </h2>
                                        <p className="text-muted-foreground line-clamp-3 mb-4 flex-1">
                                            {blog.short_description || "Read more about this topic..."}
                                        </p>
                                        <span className="text-accent font-medium text-sm group-hover:underline">
                                            Read Article →
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default BlogListing;
