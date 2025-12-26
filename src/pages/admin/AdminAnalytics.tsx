import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Mail, 
  Eye, 
  MousePointerClick, 
  MessageSquare,
  TrendingUp,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailStats {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
}

interface DomainPerformance {
  domain: string;
  count: number;
  opened: number;
  clicked: number;
}

export default function AdminAnalytics() {
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [domainPerformance, setDomainPerformance] = useState<DomainPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch email tracking stats
      const { data: trackingData } = await supabase
        .from("email_tracking")
        .select("*");

      if (trackingData) {
        const total = trackingData.length;
        const opened = trackingData.filter((e) => e.opened_at).length;
        const clicked = trackingData.filter((e) => e.clicked_at).length;
        const replied = trackingData.filter((e) => e.replied_at).length;

        setEmailStats({
          total_sent: total,
          total_opened: opened,
          total_clicked: clicked,
          total_replied: replied,
          open_rate: total > 0 ? (opened / total) * 100 : 0,
          click_rate: total > 0 ? (clicked / total) * 100 : 0,
          reply_rate: total > 0 ? (replied / total) * 100 : 0,
        });

        // Domain performance
        const domainMap = new Map<string, DomainPerformance>();
        trackingData.forEach((email) => {
          const domain = email.domain || "unknown";
          const existing = domainMap.get(domain) || { domain, count: 0, opened: 0, clicked: 0 };
          existing.count++;
          if (email.opened_at) existing.opened++;
          if (email.clicked_at) existing.clicked++;
          domainMap.set(domain, existing);
        });
        setDomainPerformance(
          Array.from(domainMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );

        // Daily stats (last 7 days)
        const dailyMap = new Map<string, number>();
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split("T")[0];
        }).reverse();

        last7Days.forEach((date) => dailyMap.set(date, 0));
        trackingData.forEach((email) => {
          if (email.sent_at) {
            const date = email.sent_at.split("T")[0];
            if (dailyMap.has(date)) {
              dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
            }
          }
        });
        setDailyStats(
          Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Emails Sent",
      value: emailStats?.total_sent || 0,
      icon: Mail,
      color: "text-blue-500",
    },
    {
      title: "Emails Opened",
      value: emailStats?.total_opened || 0,
      subtitle: `${emailStats?.open_rate?.toFixed(1) || 0}% open rate`,
      icon: Eye,
      color: "text-green-500",
    },
    {
      title: "Links Clicked",
      value: emailStats?.total_clicked || 0,
      subtitle: `${emailStats?.click_rate?.toFixed(1) || 0}% click rate`,
      icon: MousePointerClick,
      color: "text-purple-500",
    },
    {
      title: "Replies Received",
      value: emailStats?.total_replied || 0,
      subtitle: `${emailStats?.reply_rate?.toFixed(1) || 0}% reply rate`,
      icon: MessageSquare,
      color: "text-orange-500",
    },
  ];

  return (
    <AdminLayout>
      <Helmet>
        <title>Analytics | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">Email performance and engagement metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Daily Email Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Daily Email Activity
              </CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-2">
                  {dailyStats.map((day) => {
                    const maxCount = Math.max(...dailyStats.map((d) => d.count), 1);
                    return (
                      <div key={day.date} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-20">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all flex items-center justify-end pr-2"
                            style={{ width: `${Math.max((day.count / maxCount) * 100, 5)}%` }}
                          >
                            <span className="text-xs font-medium text-accent-foreground">
                              {day.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Domains */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Top Performing Domains
              </CardTitle>
              <CardDescription>By email volume and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : domainPerformance.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <div className="space-y-3">
                  {domainPerformance.slice(0, 5).map((domain, index) => {
                    const openRate = domain.count > 0 ? (domain.opened / domain.count) * 100 : 0;
                    return (
                      <div key={domain.domain} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize">{domain.domain}</span>
                            <span className="text-sm text-muted-foreground">
                              {domain.count} sent
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {openRate.toFixed(0)}% opened
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointerClick className="h-3 w-3" />
                              {domain.clicked} clicks
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Engagement Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Email Engagement Funnel
            </CardTitle>
            <CardDescription>From sent to reply</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex items-end justify-around h-48 gap-4">
                {[
                  { label: "Sent", value: emailStats?.total_sent || 0, color: "bg-blue-500" },
                  { label: "Opened", value: emailStats?.total_opened || 0, color: "bg-green-500" },
                  { label: "Clicked", value: emailStats?.total_clicked || 0, color: "bg-purple-500" },
                  { label: "Replied", value: emailStats?.total_replied || 0, color: "bg-orange-500" },
                ].map((stage) => {
                  const maxValue = emailStats?.total_sent || 1;
                  const height = Math.max((stage.value / maxValue) * 100, 10);
                  return (
                    <div key={stage.label} className="flex flex-col items-center flex-1">
                      <span className="text-2xl font-bold mb-2">{stage.value}</span>
                      <div className="w-full flex justify-center">
                        <div
                          className={`w-16 ${stage.color} rounded-t-lg transition-all`}
                          style={{ height: `${height}%`, minHeight: "20px" }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground mt-2">{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
