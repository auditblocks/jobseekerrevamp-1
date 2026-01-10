import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  BarChart3, 
  Users, 
  Briefcase, 
  Send,
  TrendingUp,
  Clock,
  LogOut,
  Menu,
  X,
  Home,
  MessageSquare,
  Settings,
  FileText,
  Sparkles,
  Shield,
  Eye,
  Activity,
  FileSearch,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/NotificationBell";
import { InAppNotificationPopup } from "@/components/InAppNotificationPopup";

interface DashboardStats {
  emailsSent: number;
  openRate: number;
  responses: number;
  applications: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isSuperadmin, signOut, profile } = useAuth();
  const isProUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        setStatsLoading(true);
        
        // Always fetch real user data from database
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

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Map icon names to actual icon components
  const iconMap: Record<string, any> = {
    Send,
    Eye,
    MessageSquare,
    Briefcase,
    Mail,
    BarChart3,
    Users,
    TrendingUp,
    Activity,
  };

  // Always use real user data for dashboard stats
  const statCards = [
    { label: "Emails Sent", value: stats.emailsSent.toString(), icon: Send, color: "text-accent", bg: "bg-accent/10" },
    { label: "Open Rate", value: `${stats.openRate}%`, icon: Eye, color: "text-success", bg: "bg-success/10" },
    { label: "Responses", value: stats.responses.toString(), icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
    { label: "Applications", value: stats.applications.toString(), icon: Briefcase, color: "text-warning", bg: "bg-warning/10" },
  ];

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Send, label: "Compose", path: "/compose" },
    { icon: Mail, label: "Email History", path: "/email-history" },
    { icon: MessageSquare, label: "Conversations", path: "/conversations" },
    { icon: Briefcase, label: "Applications", path: "/applications" },
    { icon: FileText, label: "Templates", path: "/templates" },
    { icon: Users, label: "Recruiters", path: "/recruiters" },
    { icon: FileSearch, label: "Resume Optimizer", path: "/resume-optimizer", badge: isProUser ? "PRO" : "NEW" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
    ...(isSuperadmin ? [{ icon: Shield, label: "Admin Portal", path: "/admin" }] : []),
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard - JobSeeker</title>
        <meta name="description" content="Manage your job search, send emails to recruiters, and track your applications." />
      </Helmet>
      
      <div className="min-h-screen bg-background flex" style={{ isolation: 'auto' }}>
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-2 px-6 py-6 border-b border-sidebar-border">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow">
                <Mail className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold text-sidebar-foreground">JobSeeker</span>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden ml-auto text-sidebar-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={index}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {(item as any).badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        (item as any).badge === "PRO" 
                          ? 'bg-accent/20 text-accent' 
                          : 'bg-green-500/20 text-green-500'
                      }`}>
                        {(item as any).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            
            {/* User Section */}
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-accent-foreground font-semibold">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.user_metadata?.name || "User"}
                  </div>
                  <div className="text-xs text-sidebar-foreground/60 truncate">
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-foreground"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <NotificationBell />
              {/* Show upgrade button based on current subscription tier */}
              {profile?.subscription_tier !== "PRO_MAX" && (
                <Button variant="accent" size="sm" className="text-xs sm:text-sm" onClick={() => navigate("/dashboard/subscription")}>
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">
                    {profile?.subscription_tier === "PRO" ? "Upgrade to Pro Max" : "Upgrade to Pro"}
                  </span>
                  <span className="sm:hidden">Upgrade</span>
                </Button>
              )}
            </div>
          </header>
          
          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Welcome */}
            <motion.div
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
                  { icon: Send, label: "Send Emails", description: "Reach out to recruiters", path: "/compose" },
                  { icon: Briefcase, label: "Track Application", description: "Add a new job application", path: "/applications" },
                  { icon: Users, label: "Browse Recruiters", description: "Find recruiters in your field", path: "/recruiters" },
                  { icon: FileSearch, label: "Resume Optimizer", description: "Optimize your resume with AI", path: "/resume-optimizer" },
                ].map((action, index) => (
                  <button
                    key={index}
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
        </main>

        {/* In-App Notification Popup */}
        <InAppNotificationPopup />
      </div>
    </>
  );
};

export default Dashboard;
