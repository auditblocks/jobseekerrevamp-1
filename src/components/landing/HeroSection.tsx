import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, BarChart3, Users, Sparkles, Send, Eye, MessageSquare, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const [landingStats, setLandingStats] = useState({
    activeUsers: "10k+",
    emailsSent: "500k+",
    responseRate: "45%",
  });
  const [dashboardPreviewStats, setDashboardPreviewStats] = useState([
    { label: "Sent", value: "248", icon: Mail },
    { label: "Opened", value: "156", icon: BarChart3 },
    { label: "Replies", value: "67", icon: Users },
  ]);

  useEffect(() => {
    // Fetch dashboard config for landing page stats
    const fetchLandingStats = async () => {
      try {
        const { data: dashboardConfigs } = await supabase
          .from("dashboard_config" as any)
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (dashboardConfigs && dashboardConfigs.length > 0) {
          // Map config to landing page stats
          const configMap: Record<string, any> = {};
          dashboardConfigs.forEach((config: any) => {
            configMap[config.config_key] = config.config_value;
          });

          // Update landing page top stats if configured
          if (configMap.active_users) {
            setLandingStats(prev => ({
              ...prev,
              activeUsers: formatNumber(configMap.active_users.value),
            }));
          }
          if (configMap.emails_sent) {
            setLandingStats(prev => ({
              ...prev,
              emailsSent: formatNumber(configMap.emails_sent.value),
            }));
          }
          if (configMap.response_rate) {
            setLandingStats(prev => ({
              ...prev,
              responseRate: `${configMap.response_rate.value}%`,
            }));
          }

          // Update dashboard preview stats
          const iconMap: Record<string, any> = {
            Send: Mail,
            Eye: BarChart3,
            MessageSquare: Users,
            Briefcase: Briefcase,
            Mail: Mail,
            BarChart3: BarChart3,
            Users: Users,
          };

          const previewStats = dashboardConfigs
            .slice(0, 3)
            .map((config: any) => {
              const IconComponent = iconMap[config.config_value?.icon] || Mail;
              return {
                label: config.config_value?.label || "Stat",
                value: config.config_value?.value?.toString() || "0",
                icon: IconComponent,
              };
            });

          if (previewStats.length > 0) {
            setDashboardPreviewStats(previewStats);
          }
        }
      } catch (error) {
        console.log("Dashboard config not available, using default stats");
      }
    };

    fetchLandingStats();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k+`;
    return num.toString();
  };
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-accent/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-primary-foreground">JobSeeker</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 sm:gap-4"
        >
          <Link
            to="/pricing"
            className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors hidden sm:block"
          >
            Pricing
          </Link>
          <Link
            to="/blog"
            className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors hidden sm:block"
          >
            Blog
          </Link>
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              Sign In
            </Button>
          </Link>
          <Link to="/auth?mode=signup">
            <Button variant="hero" size="sm" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-32 lg:pt-32">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">AI-Powered Job Outreach</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight"
            >
              AI Job Search &{" "}
              <span className="relative">
                <span className="text-accent">Outreach Platform</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 10C50 4 150 4 198 10" stroke="hsl(173 80% 40%)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-primary-foreground/70 max-w-xl"
            >
              JobSeeker is an <span className="font-semibold text-primary-foreground">AI job search platform</span> that helps you automate recruiter outreach with personalized emails.
              Send automated job applications, track recruiter responses, and manage your entire job search pipeline in one place.
              Boost your job search success rate with intelligent email tracking, follow-up reminders, and comprehensive application management.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="heroOutline" size="xl" className="w-full sm:w-auto text-primary-foreground">
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center gap-8 pt-8 border-t border-primary-foreground/10"
            >
              <div>
                <div className="text-3xl font-bold text-accent">{landingStats.activeUsers}</div>
                <div className="text-sm text-primary-foreground/60">Active Users</div>
              </div>
              <div className="w-px h-12 bg-primary-foreground/20" />
              <div>
                <div className="text-3xl font-bold text-accent">{landingStats.emailsSent}</div>
                <div className="text-sm text-primary-foreground/60">Emails Sent</div>
              </div>
              <div className="w-px h-12 bg-primary-foreground/20" />
              <div>
                <div className="text-3xl font-bold text-accent">{landingStats.responseRate}</div>
                <div className="text-sm text-primary-foreground/60">Response Rate</div>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Feature Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {/* Main Dashboard Preview Card */}
            <div className="relative">
              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-8 -left-8 glass p-4 rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Email Sent!</div>
                    <div className="text-xs text-muted-foreground">To: recruiter@tech.co</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -right-4 glass p-4 rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">45% Open Rate</div>
                    <div className="text-xs text-muted-foreground">This week</div>
                  </div>
                </div>
              </motion.div>

              {/* Main Card */}
              <div className="glass rounded-3xl p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">Dashboard</h3>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary border-2 border-card" />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {dashboardPreviewStats.map((stat, index) => (
                      <div key={index} className="bg-secondary/50 rounded-xl p-4 text-center">
                        <stat.icon className="w-5 h-5 mx-auto text-accent mb-2" />
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="h-32 bg-secondary/30 rounded-xl flex items-end justify-around p-4">
                    {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                      <div
                        key={i}
                        className="w-6 bg-accent/70 rounded-t-md"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(220 20% 97%)" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
