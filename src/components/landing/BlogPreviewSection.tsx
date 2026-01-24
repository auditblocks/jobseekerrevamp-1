import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";

const BlogPreviewSection = () => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const { data, error } = await supabase
                    .from("blogs" as any)
                    .select("*")
                    .eq("status", "published")
                    .order("published_at", { ascending: false })
                    .limit(3);

                if (error) throw error;
                setBlogs(data || []);
            } catch (error) {
                console.error("Error fetching homepage blogs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    if (loading && blogs.length === 0) {
        return (
            <div className="py-24 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!loading && blogs.length === 0) return null;

    return (
        <section className="py-24 bg-muted/30 relative">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div className="space-y-4 max-w-2xl text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                            Our Knowledge Base
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Latest Career Insights</h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">Expert advice on job search automation, AI tools, and navigating the modern job market.</p>
                    </div>
                    <Link to="/blog">
                        <Button variant="outline" className="rounded-full px-8 h-12 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all">
                            View All Posts <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-10">
                    {blogs.map((blog, index) => (
                        <motion.article
                            key={blog.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group flex flex-col bg-card rounded-[2rem] border border-border/50 hover:border-accent/30 transition-all duration-500 overflow-hidden hover:shadow-2xl hover:shadow-accent/5"
                        >
                            <Link to={`/blog/${blog.slug}`} className="block aspect-[16/10] overflow-hidden relative">
                                {blog.featured_image_url ? (
                                    <img
                                        src={blog.featured_image_url}
                                        alt={blog.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-accent/5 flex items-center justify-center">
                                        <span className="text-accent/20 font-bold italic text-2xl">JobSeeker</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                                    <span className="text-white font-bold text-sm">Read Full Perspective</span>
                                </div>
                            </Link>
                            <div className="p-8 flex flex-col flex-1">
                                <div className="text-[10px] text-muted-foreground mb-4 flex items-center gap-3 font-bold uppercase tracking-widest">
                                    <span className="text-accent">Article</span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>{blog.published_at ? format(new Date(blog.published_at), "MMMM d, yyyy") : "Recent"}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                                    <Link to={`/blog/${blog.slug}`}>{blog.title}</Link>
                                </h3>
                                <p className="text-muted-foreground text-sm line-clamp-3 mb-8 flex-1 leading-relaxed">
                                    {blog.short_description || "Stay tuned for more insights and updates from the world of AI-powered job searching..."}
                                </p>
                                <Link to={`/blog/${blog.slug}`} className="text-accent font-bold text-sm inline-flex items-center hover:gap-3 transition-all">
                                    Read Article <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BlogPreviewSection;
