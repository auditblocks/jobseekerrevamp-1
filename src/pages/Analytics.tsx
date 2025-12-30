import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  TrendingUp,
  Mail,
  Eye,
  MousePointer,
  Reply,
  AlertCircle,
  Calendar,
  BarChart3,
  PieChart,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell
} from "recharts";
import { format, subDays, startOfDay, parseISO } from "date-fns";

interface EmailStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

interface DailyStats {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

interface DomainPerformance {
  domain: string;
  total: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [domainPerformance, setDomainPerformance] = useState<DomainPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const { data: emails, error } = await supabase
          .from("email_tracking")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;

        if (!emails || emails.length === 0) {
          setIsLoading(false);
          return;
        }

        // Calculate overall stats
        const sent = emails.length;
        const delivered = emails.filter(e => e.status === "delivered" || e.opened_at || e.clicked_at || e.replied_at).length;
        const opened = emails.filter(e => e.opened_at).length;
        const clicked = emails.filter(e => e.clicked_at).length;
        const replied = emails.filter(e => e.replied_at).length;
        const bounced = emails.filter(e => e.bounced_at).length;

        setStats({
          totalSent: sent,
          delivered,
          opened,
          clicked,
          replied,
          bounced,
          openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
          clickRate: opened > 0 ? Math.round((clicked / opened) * 1000) / 10 : 0,
          replyRate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
        });

        // Calculate daily stats for last 7 days
        const dailyData: DailyStats[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStr = format(date, "yyyy-MM-dd");
          const dayStart = startOfDay(date).toISOString();
          const dayEnd = startOfDay(subDays(date, -1)).toISOString();
          
          const dayEmails = emails.filter(e => {
            const sentAt = e.sent_at;
            return sentAt && sentAt >= dayStart && sentAt < dayEnd;
          });

          dailyData.push({
            date: format(date, "MMM d"),
            sent: dayEmails.length,
            opened: dayEmails.filter(e => e.opened_at).length,
            clicked: dayEmails.filter(e => e.clicked_at).length,
            replied: dayEmails.filter(e => e.replied_at).length,
          });
        }
        setDailyStats(dailyData);

        // Calculate domain performance
        const domainMap = new Map<string, { total: number; opened: number; clicked: number }>();
        emails.forEach(email => {
          const domain = email.domain || "unknown";
          const current = domainMap.get(domain) || { total: 0, opened: 0, clicked: 0 };
          domainMap.set(domain, {
            total: current.total + 1,
            opened: current.opened + (email.opened_at ? 1 : 0),
            clicked: current.clicked + (email.clicked_at ? 1 : 0),
          });
        });

        const domainData: DomainPerformance[] = Array.from(domainMap.entries())
          .map(([domain, data]) => ({
            domain,
            total: data.total,
            opened: data.opened,
            clicked: data.clicked,
            openRate: data.total > 0 ? Math.round((data.opened / data.total) * 100) : 0,
            clickRate: data.opened > 0 ? Math.round((data.clicked / data.opened) * 100) : 0,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        setDomainPerformance(domainData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("analytics-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_tracking",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          // Refetch analytics on any change
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const statusDistribution = [
    { name: "Delivered", value: stats.delivered, color: "hsl(var(--accent))" },
    { name: "Opened", value: stats.opened, color: "hsl(200, 80%, 50%)" },
    { name: "Clicked", value: stats.clicked, color: "hsl(270, 80%, 60%)" },
    { name: "Replied", value: stats.replied, color: "hsl(var(--success))" },
    { name: "Bounced", value: stats.bounced, color: "hsl(var(--destructive))" },
  ].filter(item => item.value > 0);

  const statCards = [
    { label: "Emails Sent", value: stats.totalSent, icon: Mail, color: "text-accent", change: "+12%" },
    { label: "Opened", value: stats.opened, icon: Eye, color: "text-blue-500", rate: stats.openRate },
    { label: "Clicked", value: stats.clicked, icon: MousePointer, color: "text-purple-500", rate: stats.clickRate },
    { label: "Replied", value: stats.replied, icon: Reply, color: "text-success", rate: stats.replyRate },
  ];

  return (
    <>
      <Helmet>
        <title>Analytics | JobSeeker</title>
        <meta name="description" content="Track your email outreach performance with real-time analytics" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Analytics</h1>
                  <p className="text-sm text-muted-foreground">Real-time outreach performance</p>
                </div>
              </div>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Last 30 Days
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    {isLoading ? (
                      <>
                        <Skeleton className="h-5 w-5 mb-2" />
                        <Skeleton className="h-8 w-16 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`h-5 w-5 ${stat.color}`} />
                          {stat.rate !== undefined && (
                            <Badge variant="secondary" className="text-xs text-success">
                              {stat.rate}%
                            </Badge>
                          )}
                          {stat.change && (
                            <Badge variant="secondary" className="text-xs">
                              <TrendingUp className="h-3 w-3 mr-1 text-success" />
                              {stat.change}
                            </Badge>
                          )}
                        </div>
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          {/* Additional Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8"
          >
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      <Badge variant="secondary" className="text-xs">
                        {stats.totalSent > 0 ? Math.round((stats.delivered / stats.totalSent) * 100) : 0}%
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold">{stats.delivered}</p>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <Badge variant="secondary" className="text-xs text-destructive">
                        {stats.totalSent > 0 ? Math.round((stats.bounced / stats.totalSent) * 100) : 0}%
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold">{stats.bounced}</p>
                    <p className="text-sm text-muted-foreground">Bounced</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Daily Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-accent" />
                        Daily Performance
                      </CardTitle>
                      <CardDescription>Email activity over the past week</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : dailyStats.length === 0 || dailyStats.every(d => d.sent === 0) ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="text-center">
                        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No email data yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="sent"
                            name="Sent"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--accent))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="opened"
                            name="Opened"
                            stroke="hsl(200, 80%, 50%)"
                            strokeWidth={2}
                            dot={{ fill: "hsl(200, 80%, 50%)" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="clicked"
                            name="Clicked"
                            stroke="hsl(270, 80%, 60%)"
                            strokeWidth={2}
                            dot={{ fill: "hsl(270, 80%, 60%)" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="replied"
                            name="Replied"
                            stroke="hsl(var(--success))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--success))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent" />
                      <span className="text-sm text-muted-foreground">Sent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: "hsl(200, 80%, 50%)" }} />
                      <span className="text-sm text-muted-foreground">Opened</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: "hsl(270, 80%, 60%)" }} />
                      <span className="text-sm text-muted-foreground">Clicked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: "hsl(var(--success))" }} />
                      <span className="text-sm text-muted-foreground">Replied</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Status Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border/50 bg-card/50 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-accent" />
                    Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : statusDistribution.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <p className="text-muted-foreground">No data yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie
                              data={statusDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              dataKey="value"
                            >
                              {statusDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-4">
                        {statusDistribution.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ background: item.color }}
                              />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-sm font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Domain Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Top Performing Domains
                </CardTitle>
                <CardDescription>Performance breakdown by domain</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : domainPerformance.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No domain data yet</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={domainPerformance} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis
                            dataKey="domain"
                            type="category"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            width={100}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="openRate" name="Open Rate %" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="clickRate" name="Click Rate %" fill="hsl(270, 80%, 60%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-sm text-muted-foreground">Open Rate %</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: "hsl(270, 80%, 60%)" }} />
                        <span className="text-sm text-muted-foreground">Click Rate %</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default Analytics;
