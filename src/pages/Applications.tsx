import { Helmet } from "react-helmet-async";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Plus,
  Briefcase,
  Building2,
  Calendar,
  MoreVertical,
  Clock,
  XCircle,
  Eye,
  MessageSquare,
  Trophy,
  Edit,
  Trash2,
  ExternalLink,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Application {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
  application_date: string | null;
  interview_date: string | null;
  source: string | null;
  recruiter_email: string;
  recruiter_name: string | null;
  notes: string | null;
  offer_amount: number | null;
  job_url: string | null;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  applied: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "Applied" },
  viewed: { icon: Eye, color: "text-purple-500", bg: "bg-purple-500/10", label: "Viewed" },
  interview_scheduled: { icon: Calendar, color: "text-accent", bg: "bg-accent/10", label: "Interview" },
  interviewed: { icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-500/10", label: "Interviewed" },
  offered: { icon: Trophy, color: "text-success", bg: "bg-success/10", label: "Offered" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
  withdrawn: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50", label: "Withdrawn" },
};

const Applications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: "",
    job_title: "",
    recruiter_email: "",
    recruiter_name: "",
    status: "applied",
    source: "email_outreach",
    job_url: "",
    notes: "",
    offer_amount: "",
    interview_date: "",
  });

  useEffect(() => {
    if (user?.id) {
      fetchApplications();
      subscribeToChanges();
    }
  }, [user?.id]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("application_date", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`applications-${user!.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_applications",
          filter: `user_id=eq.${user!.id}`,
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.job_title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    thisMonth: applications.filter((a) => {
      const appDate = new Date(a.application_date || "");
      const now = new Date();
      return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
    }).length,
    interviews: applications.filter((a) => ["interview_scheduled", "interviewed"].includes(a.status)).length,
    offers: applications.filter((a) => a.status === "offered").length,
  };

  const openAddDialog = () => {
    setEditingApp(null);
    setFormData({
      company_name: "",
      job_title: "",
      recruiter_email: "",
      recruiter_name: "",
      status: "applied",
      source: "email_outreach",
      job_url: "",
      notes: "",
      offer_amount: "",
      interview_date: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (app: Application) => {
    setEditingApp(app);
    setFormData({
      company_name: app.company_name,
      job_title: app.job_title,
      recruiter_email: app.recruiter_email,
      recruiter_name: app.recruiter_name || "",
      status: app.status,
      source: app.source || "email_outreach",
      job_url: app.job_url || "",
      notes: app.notes || "",
      offer_amount: app.offer_amount?.toString() || "",
      interview_date: app.interview_date?.split("T")[0] || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.company_name || !formData.job_title || !formData.recruiter_email) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_name: formData.company_name,
        job_title: formData.job_title,
        recruiter_email: formData.recruiter_email,
        recruiter_name: formData.recruiter_name || null,
        status: formData.status,
        source: formData.source,
        job_url: formData.job_url || null,
        notes: formData.notes || null,
        offer_amount: formData.offer_amount ? parseFloat(formData.offer_amount) : null,
        interview_date: formData.interview_date || null,
        user_id: user!.id,
      };

      if (editingApp) {
        const { error } = await supabase
          .from("job_applications")
          .update(payload)
          .eq("id", editingApp.id);
        if (error) throw error;
        toast.success("Application updated!");
      } else {
        const { error } = await supabase
          .from("job_applications")
          .insert({ ...payload, application_date: new Date().toISOString() });
        if (error) throw error;
        toast.success("Application added!");
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Application deleted!");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      toast.success("Status updated!");
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Applications | JobSeeker</title>
        <meta name="description" content="Track all your job applications in one place" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Applications</h1>
                  <p className="text-sm text-muted-foreground">Track your job applications</p>
                </div>
              </div>
              <Button variant="hero" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Briefcase className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Applications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.thisMonth}</p>
                    <p className="text-xs text-muted-foreground">This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.interviews}</p>
                    <p className="text-xs text-muted-foreground">Interviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Trophy className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.offers}</p>
                    <p className="text-xs text-muted-foreground">Offers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50"
              />
            </div>
          </motion.div>

          {/* Status Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            <Button
              variant={statusFilter === null ? "accent" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(null)}
            >
              All
            </Button>
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = applications.filter((a) => a.status === key).length;
              if (count === 0) return null;
              return (
                <Button
                  key={key}
                  variant={statusFilter === key ? "accent" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                >
                  {config.label} ({count})
                </Button>
              );
            })}
          </motion.div>

          {/* Applications List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {filteredApplications.length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-8 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                  <p className="text-muted-foreground mb-4">Start tracking your job applications</p>
                  <Button variant="hero" onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Application
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredApplications.map((app, index) => {
                const status = statusConfig[app.status] || statusConfig.applied;
                const StatusIcon = status.icon;
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-border/50 bg-card/50 hover:border-border transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${status.bg} shrink-0`}>
                            <StatusIcon className={`h-5 w-5 ${status.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-lg">{app.job_title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">{app.company_name}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`${status.bg} ${status.color} border-0`}>
                                  {status.label}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(app)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    {app.job_url && (
                                      <DropdownMenuItem onClick={() => window.open(app.job_url!, "_blank")}>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View Job
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(app.id)}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Applied {app.application_date ? new Date(app.application_date).toLocaleDateString() : "N/A"}
                              </div>
                              {app.interview_date && (
                                <div className="flex items-center gap-1 text-accent">
                                  <Clock className="h-4 w-4" />
                                  Interview {new Date(app.interview_date).toLocaleDateString()}
                                </div>
                              )}
                              {app.offer_amount && (
                                <div className="flex items-center gap-1 text-success font-medium">
                                  <Trophy className="h-4 w-4" />
                                  ₹{app.offer_amount.toLocaleString()}
                                </div>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {(app.source || "email_outreach").replace("_", " ")}
                              </Badge>
                            </div>
                            {app.notes && (
                              <p className="mt-3 text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
                                {app.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </main>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingApp ? "Edit Application" : "Add Application"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Company *</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Job Title *</label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Job title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recruiter Email *</label>
                <Input
                  value={formData.recruiter_email}
                  onChange={(e) => setFormData({ ...formData, recruiter_email: e.target.value })}
                  placeholder="recruiter@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Recruiter Name</label>
                <Input
                  value={formData.recruiter_name}
                  onChange={(e) => setFormData({ ...formData, recruiter_name: e.target.value })}
                  placeholder="Recruiter name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Source</label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_outreach">Email Outreach</SelectItem>
                    <SelectItem value="job_board">Job Board</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="company_website">Company Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Interview Date</label>
                <Input
                  type="date"
                  value={formData.interview_date}
                  onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Offer Amount (₹)</label>
                <Input
                  type="number"
                  value={formData.offer_amount}
                  onChange={(e) => setFormData({ ...formData, offer_amount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Job URL</label>
              <Input
                value={formData.job_url}
                onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingApp ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Applications;
