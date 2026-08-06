/**
 * @file Dashboard.tsx
 * @description Main authenticated dashboard page. Serves as the landing page after login,
 * displaying email outreach stats, onboarding progress, quick actions, and recent activity.
 * Also triggers the guided product tour for first-time users.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Send,
  Eye,
  Users,
  FileSearch,
  Mail,
  FileText,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { InAppNotificationPopup } from "@/components/InAppNotificationPopup";
import DashboardLayout from "@/components/DashboardLayout";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { ReferralDashboardBanner } from "@/components/ReferralDashboardBanner";
import { useTour } from "@/hooks/useTour";
import { EmptyState } from "@/components/common/EmptyState";

interface DashboardStats {
  emailsSent: number;
  openRate: number;
}

interface RecentEmail {
  id: string;
  recipient: string;
  subject: string;
  sent_at: string | null;
  opened_at: string | null;
}

/**
 * Dashboard page component.
 * Fetches email tracking stats, checks template existence for onboarding,
 * and initiates the product tour once auth is ready.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    emailsSent: 0,
    openRate: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // Redirect unauthenticated users to the auth page
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const [hasTemplates, setHasTemplates] = useState(false);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        setStatsLoading(true);
        setStatsError(false);

        const { data: emailData, error: emailError } = await supabase
          .from("email_tracking")
          .select("id, opened_at")
          .eq("user_id", user.id);

        if (emailError) throw emailError;

        // Check for templates
        const { count: templatesCount, error: templatesError } = await supabase
          .from("email_templates")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!templatesError) {
          setHasTemplates((templatesCount || 0) > 0);
        }

        // Derive open rate from the ratio of opened emails to total sent
        const totalEmails = emailData?.length || 0;
        const openedEmails = emailData?.filter(e => e.opened_at !== null).length || 0;
        const openRate = totalEmails > 0 ? Math.round((openedEmails / totalEmails) * 100) : 0;

        setStats({
          emailsSent: totalEmails,
          openRate,
        });

        // Pull the last few sent emails so "Recent Activity" shows real activity
        // instead of a static placeholder once the user has actually sent something.
        if (totalEmails > 0) {
          const { data: recent, error: recentError } = await supabase
            .from("email_tracking")
            .select("id, recipient, subject, sent_at, opened_at")
            .eq("user_id", user.id)
            .order("sent_at", { ascending: false, nullsFirst: false })
            .limit(5);

          if (!recentError && recent) {
            setRecentEmails(recent);
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStatsError(true);
      } finally {
        setStatsLoading(false);
      }
    };

    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  const { startTour, restartTour } = useTour();

  const isGmailConnected = !!profile?.google_refresh_token;
  const hasSentEmail = stats.emailsSent > 0;
  const hasCompletedOnboarding = isGmailConnected && hasTemplates && hasSentEmail;

  // Kick off the guided product tour once the user session is confirmed. Auto-start is
  // gated on onboarding completion (see useTour) so it can resurface for a returning
  // user who hasn't finished setup, not just on a permanent first-visit flag.
  useEffect(() => {
    if (!authLoading && user && !statsLoading) {
      startTour(hasCompletedOnboarding);
    }
  }, [authLoading, user, statsLoading, hasCompletedOnboarding, startTour]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /** What to nudge the user toward next, based on where they actually are in onboarding. */
  const nextStep = !isGmailConnected
    ? {
        icon: Mail,
        title: "Connect Gmail to start reaching out",
        description: "Sending goes through your own inbox, so replies land where you'll see them.",
        cta: "Connect Gmail",
        path: "/compose",
      }
    : !hasTemplates
    ? {
        icon: FileText,
        title: "Create your first template",
        description: "A saved template makes sending to multiple recruiters much faster.",
        cta: "Create a template",
        path: "/templates",
      }
    : {
        icon: Send,
        title: "Send your first email",
        description: "You're set up — pick a recruiter and send your first outreach email.",
        cta: "Browse recruiters",
        path: "/recruiters",
      };

  const statCards = [
    { label: "Emails Sent", value: stats.emailsSent.toString(), icon: Send, color: "text-accent", bg: "bg-accent/10" },
    { label: "Open Rate", value: `${stats.openRate}%`, icon: Eye, color: "text-success", bg: "bg-success/10" },
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button variant="hero" size="default" className="w-full sm:w-auto" onClick={() => navigate("/compose")}>
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              Compose Email
            </Button>
            <Button
              variant="ghost"
              size="default"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => restartTour()}
            >
              Replay tour
            </Button>
          </div>
        </motion.div>

        <ReferralDashboardBanner />

        {/* Onboarding Progress */}
        <motion.div
          id="onboarding-progress"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <OnboardingProgress
            isGmailConnected={isGmailConnected}
            hasTemplates={hasTemplates}
            hasSentEmail={hasSentEmail}
          />
        </motion.div>

        {/* Stats Grid */}
        {statsError ? (
          <div className="max-w-2xl bg-card rounded-lg sm:rounded-xl border border-border shadow-card">
            <EmptyState
              variant="error"
              title="Couldn't load your stats"
              description="Something went wrong fetching your dashboard stats."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-6 max-w-2xl">
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
        )}

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

        {/* Recent Activity — shows real sends once there are any, otherwise a concrete next step */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {recentEmails.length > 0 ? "Recent Activity" : "Next Step"}
          </h3>

          {recentEmails.length > 0 ? (
            <div className="space-y-2">
              {recentEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-background/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{email.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">to {email.recipient}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.opened_at && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Opened
                      </span>
                    )}
                    {email.sent_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(email.sent_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <nextStep.icon className="w-8 h-8 text-accent" />
              </div>
              <p className="font-medium text-foreground">{nextStep.title}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{nextStep.description}</p>
              <Button
                variant="hero"
                size="sm"
                className="mt-4"
                onClick={() => navigate(nextStep.path)}
              >
                {nextStep.cta}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* In-App Notification Popup */}
      <InAppNotificationPopup />
    </DashboardLayout>
  );
};

export default Dashboard;
