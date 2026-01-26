import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Send,
  Eye,
  MessageSquare,
  Briefcase,
  Users,
  Clock,
  FileSearch,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { InAppNotificationPopup } from "@/components/InAppNotificationPopup";
import DashboardLayout from "@/components/DashboardLayout";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { useTour } from "@/hooks/useTour";

interface DashboardStats {
  emailsSent: number;
  openRate: number;
  responses: number;
  applications: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    emailsSent: 0,
    openRate: 0,
    responses: 0,
    applications: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const [hasTemplates, setHasTemplates] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        setStatsLoading(true);

        const { data: emailData, error: emailError } = await supabase
          .from("email_tracking")
          .select("id, opened_at, replied_at")
          .eq("user_id", user.id);

        if (emailError) throw emailError;

        const { count: applicationsCount, error: appError } = await supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (appError) throw appError;

        // Check for templates
        const { count: templatesCount, error: templatesError } = await supabase
          .from("email_templates")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!templatesError) {
          setHasTemplates((templatesCount || 0) > 0);
        }

        const totalEmails = emailData?.length || 0;
        const openedEmails = emailData?.filter(e => e.opened_at !== null).length || 0;
        const repliedEmails = emailData?.filter(e => e.replied_at !== null).length || 0;
        const openRate = totalEmails > 0 ? Math.round((openedEmails / totalEmails) * 100) : 0;

        setStats({
          emailsSent: totalEmails,
          openRate,
          responses: repliedEmails,
          applications: applicationsCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  const { startTour } = useTour();

  useEffect(() => {
    if (!authLoading && user) {
      startTour();
    }
  }, [authLoading, user, startTour]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Emails Sent", value: stats.emailsSent.toString(), icon: Send, color: "text-accent", bg: "bg-accent/10" },
    { label: "Open Rate", value: `${stats.openRate}%`, icon: Eye, color: "text-success", bg: "bg-success/10" },
    { label: "Responses", value: stats.responses.toString(), icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
    { label: "Applications", value: stats.applications.toString(), icon: Briefcase, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <DashboardLayout>
      <Helmet>
        <title>Dashboard - JobSeeker</title>
        <meta name="description" content="Manage your job search, send emails to recruiters, and track your applications." />
      </Helmet>

      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Welcome */}
        <motion.div
          id="dashboard-welcome"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-8 text-primary-foreground"
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            Welcome, {user?.user_metadata?.name || "there"}! 👋
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/70 mb-4 sm:mb-6">
            Ready to supercharge your job search? Start by sending your first email to recruiters.
          </p>
          <Button variant="hero" size="default" className="w-full sm:w-auto" onClick={() => navigate("/compose")}>
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            Compose Email
          </Button>
        </motion.div>

        {/* Onboarding Progress */}
        <motion.div
          id="onboarding-progress"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <OnboardingProgress
            isGmailConnected={!!profile?.google_refresh_token}
            hasTemplates={hasTemplates}
            hasSentEmail={stats.emailsSent > 0}
          />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border shadow-card"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
              </div>
              {statsLoading ? (
                <>
                  <Skeleton className="h-7 sm:h-9 w-12 sm:w-16 mb-1" />
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                </>
              ) : (
                <>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                </>
              )}
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Send, label: "Send Emails", description: "Reach out to recruiters", path: "/compose", id: "quick-action-compose" },
              { icon: Briefcase, label: "Track Application", description: "Add a new job application", path: "/applications" },
              { icon: Users, label: "Browse Recruiters", description: "Find recruiters in your field", path: "/recruiters", id: "quick-action-recruiters" },
              { icon: FileSearch, label: "Resume Optimizer", description: "Optimize your resume with AI", path: "/resume-optimizer" },
            ].map((action, index) => (
              <button
                key={index}
                id={action.id}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-accent/30 hover:shadow-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <action.icon className="w-6 h-6 text-accent group-hover:text-accent-foreground" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{action.label}</div>
                  <div className="text-sm text-muted-foreground">{action.description}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No recent activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start by sending your first email to recruiters</p>
          </div>
        </motion.div>
      </div>

      {/* In-App Notification Popup */}
      <InAppNotificationPopup />
    </DashboardLayout>
  );
};

export default Dashboard;
