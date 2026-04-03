import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ExternalLink, Building2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface NaukriJobRow {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  apply_url: string;
  posted_at: string | null;
  summary: string | null;
  salary_text: string | null;
  scraped_at: string | null;
}

const ApplyLatestJobs = () => {
  const { loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<NaukriJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("naukri_jobs" as never)
          .select(
            "id, title, company_name, location, apply_url, posted_at, summary, salary_text, scraped_at",
          )
          .eq("is_active", true)
          .order("scraped_at", { ascending: false })
          .limit(500);

        if (error) throw error;
        setJobs((data as unknown as NaukriJobRow[]) || []);
      } catch (e) {
        console.error(e);
        toast.error("Could not load jobs");
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) run();
  }, [authLoading]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.company_name?.toLowerCase().includes(q) ?? false) ||
        (j.location?.toLowerCase().includes(q) ?? false) ||
        (j.summary?.toLowerCase().includes(q) ?? false),
    );
  }, [jobs, searchQuery]);

  return (
    <DashboardLayout>
      <Helmet>
        <title>Apply latest jobs | JobSeeker</title>
        <meta
          name="description"
          content="Latest private job listings from Naukri (via Apify). Apply on the employer site."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Apply latest jobs</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Curated listings synced from Naukri. Click Apply to open the job on the original site.
          </p>
        </motion.div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, company, location…"
            className="pl-10 bg-card/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              {jobs.length === 0
                ? "No jobs yet. Ask an admin to configure Apify and run a sync."
                : "No jobs match your search."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
              >
                <Card className="border-border/50 bg-card/50 hover:border-accent/30 transition-colors">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <h2 className="font-semibold text-lg leading-snug">{job.title}</h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          {job.company_name ? (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {job.company_name}
                            </span>
                          ) : null}
                          {job.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {job.location}
                            </span>
                          ) : null}
                        </div>
                        {job.salary_text ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {job.salary_text}
                          </Badge>
                        ) : null}
                        {job.summary ? (
                          <p className="text-sm text-muted-foreground line-clamp-3">{job.summary}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {job.posted_at
                            ? `Posted ${format(new Date(job.posted_at), "MMM d, yyyy")}`
                            : job.scraped_at
                              ? `Synced ${format(new Date(job.scraped_at), "MMM d, yyyy")}`
                              : null}
                        </p>
                      </div>
                      <Button className="shrink-0" asChild>
                        <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                          Apply
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApplyLatestJobs;
