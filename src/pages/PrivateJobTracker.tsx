/**
 * @file PrivateJobTracker.tsx
 * @description Personal application tracker for private-sector jobs applied to via
 * "Apply latest jobs" (Naukri/LinkedIn). Rows are seeded automatically when a user
 * applies (see ApplyLatestJobs.tsx handleApply); this page lets them move each
 * application through a status lifecycle (Applied → Interview → Offer/Rejected/
 * Withdrawn) and add private notes. Mirrors GovtJobTracker.tsx's inline-status +
 * CSV export pattern, applied to the naukri_jobs source instead of govt_jobs.
 */

import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  Loader2,
  Search,
  Clock,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";

const STATUS_OPTIONS = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"] as const;
type TrackerStatus = (typeof STATUS_OPTIONS)[number];

interface NaukriJobJoinRow {
  title: string | null;
  company_name: string | null;
  location: string | null;
  apply_url: string | null;
  source: string | null;
}

interface TrackedPrivateJob {
  id: string;
  naukri_job_id: string;
  application_status: TrackerStatus;
  notes: string | null;
  applied_at: string;
  status_updated_at: string;
  naukri_jobs: NaukriJobJoinRow | NaukriJobJoinRow[] | null;
}

function jobJoin(row: TrackedPrivateJob): NaukriJobJoinRow {
  const j = Array.isArray(row.naukri_jobs) ? row.naukri_jobs[0] : row.naukri_jobs;
  return j ?? { title: null, company_name: null, location: null, apply_url: null, source: null };
}

/** Maps status values to Tailwind color classes, same palette as GovtJobTracker. */
function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "offer":
      return "bg-success/10 text-success border-success/20";
    case "rejected":
    case "withdrawn":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "interview":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Personal tracker for private-sector job applications, seeded from the apply flow. */
const PrivateJobTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trackedJobs, setTrackedJobs] = useState<TrackedPrivateJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) fetchTrackedJobs();
  }, [user]);

  const fetchTrackedJobs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("private_job_tracker" as never)
        .select(
          `*,
          naukri_jobs (
            title,
            company_name,
            location,
            apply_url,
            source
          )`,
        )
        .eq("user_id", user?.id)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      setTrackedJobs((data as unknown as TrackedPrivateJob[]) || []);
    } catch (error) {
      console.error("Error fetching private job tracker:", error);
      toast.error("Failed to load your applications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, application_status: TrackerStatus) => {
    try {
      const { error } = await supabase
        .from("private_job_tracker" as never)
        .update({ application_status } as never)
        .eq("id", id);
      if (error) throw error;
      setTrackedJobs((jobs) =>
        jobs.map((j) => (j.id === id ? { ...j, application_status } : j)),
      );
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this application from your tracker?")) return;
    try {
      const { error } = await supabase.from("private_job_tracker" as never).delete().eq("id", id);
      if (error) throw error;
      setTrackedJobs((jobs) => jobs.filter((j) => j.id !== id));
      toast.success("Removed from tracker");
    } catch (error) {
      console.error("Error deleting tracker row:", error);
      toast.error("Failed to remove");
    }
  };

  const handleExportCSV = () => {
    if (trackedJobs.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Title", "Company", "Location", "Source", "Status", "Applied On", "Notes"];
    const rows = trackedJobs.map((row) => {
      const j = jobJoin(row);
      return [
        j.title ?? "",
        j.company_name ?? "",
        j.location ?? "",
        j.source ?? "",
        row.application_status,
        format(new Date(row.applied_at), "yyyy-MM-dd"),
        row.notes ?? "",
      ];
    });
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `private_job_tracker_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredJobs = trackedJobs.filter((row) => {
    const j = jobJoin(row);
    const q = searchQuery.toLowerCase();
    return (
      (j.title ?? "").toLowerCase().includes(q) ||
      (j.company_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <Helmet>
        <title>My Applications | JobSeeker</title>
      </Helmet>

      <div className="container mx-auto px-4 pt-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">My Applications</h1>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-bold">Total applied</p>
                <p className="text-2xl font-bold">{trackedJobs.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-bold">Interviews</p>
                <p className="text-2xl font-bold text-warning">
                  {trackedJobs.filter((j) => j.application_status === "Interview").length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-bold">Offers</p>
                <p className="text-2xl font-bold text-success">
                  {trackedJobs.filter((j) => j.application_status === "Offer").length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-bold">Rejected</p>
                <p className="text-2xl font-bold text-destructive">
                  {trackedJobs.filter((j) => j.application_status === "Rejected").length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter your applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-20 border rounded-2xl bg-card/50">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">
                You haven't applied to any private jobs yet — applications you make from
                "Apply latest jobs" will show up here automatically.
              </p>
              <Button variant="link" onClick={() => navigate("/apply-latest-jobs")} className="mt-2 text-accent">
                Browse latest jobs
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="p-4 font-semibold text-sm">Job</th>
                      <th className="p-4 font-semibold text-sm">Status</th>
                      <th className="p-4 font-semibold text-sm">Applied</th>
                      <th className="p-4 font-semibold text-sm">Listing</th>
                      <th className="p-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredJobs.map((row) => {
                        const j = jobJoin(row);
                        return (
                          <motion.tr
                            key={row.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <td className="p-4">
                              <p className="font-bold text-foreground text-sm leading-tight">
                                {j.title ?? "Job listing removed"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {j.company_name ?? "—"}
                                {j.location ? ` · ${j.location}` : ""}
                              </p>
                              {j.source ? (
                                <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                                  {j.source === "linkedin" ? "LinkedIn" : "Naukri"}
                                </Badge>
                              ) : null}
                            </td>
                            <td className="p-4">
                              <Select
                                value={row.application_status}
                                onValueChange={(val) =>
                                  handleUpdateStatus(row.id, val as TrackerStatus)
                                }
                              >
                                <SelectTrigger
                                  className={`w-[130px] h-8 text-xs ${getStatusColor(row.application_status)}`}
                                >
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4 text-sm whitespace-nowrap">
                              {format(new Date(row.applied_at), "MMM dd, yyyy")}
                            </td>
                            <td className="p-4">
                              {j.apply_url ? (
                                <a
                                  href={j.apply_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(row.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PrivateJobTracker;
