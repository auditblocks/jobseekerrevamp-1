import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, CreditCard, TrendingUp, Activity, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  total_users: number;
  active_subscriptions: number;
}

interface SignupData {
  signup_date: string;
  count: number;
}

interface TierDistribution {
  tier: string;
  count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [signups, setSignups] = useState<SignupData[]>([]);
  const [tierDistribution, setTierDistribution] = useState<TierDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailStats, setEmailStats] = useState({ total: 0, today: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const { data: statsData } = await supabase.rpc("admin_get_dashboard_stats");
      if (statsData) {
        setStats(statsData as unknown as DashboardStats);
      }

      // Fetch signups
      const { data: signupsData } = await supabase.rpc("admin_get_user_signups_last_30_days");
      if (signupsData) {
        setSignups(signupsData as SignupData[]);
      }

      // Fetch tier distribution
      const { data: tierData } = await supabase.rpc("admin_get_subscription_distribution");
      if (tierData) {
        setTierDistribution(tierData as TierDistribution[]);
      }

      // Fetch email stats
      const { count: totalEmails } = await supabase
        .from("email_history")
        .select("*", { count: "exact", head: true });

      const today = new Date().toISOString().split("T")[0];
      const { count: todayEmails } = await supabase
        .from("email_history")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", today);

      setEmailStats({ total: totalEmails || 0, today: todayEmails || 0 });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats?.total_users || 0,
      icon: Users,
      description: "Registered accounts",
      color: "text-blue-500",
    },
    {
      title: "Active Subscriptions",
      value: stats?.active_subscriptions || 0,
      icon: CreditCard,
      description: "Paid users",
      color: "text-green-500",
    },
    {
      title: "Total Emails Sent",
      value: emailStats.total,
      icon: Mail,
      description: "All time",
      color: "text-purple-500",
    },
    {
      title: "Emails Today",
      value: emailStats.today,
      icon: Activity,
      description: "Sent today",
      color: "text-orange-500",
    },
  ];

  return (
    <AdminLayout>
      <Helmet>
        <title>Admin Dashboard | JobSeeker</title>
      </Helmet>

      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Overview of your platform metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {loading ? (
                  <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
                ) : (
                  <div className="text-xl sm:text-2xl font-bold">{stat.value.toLocaleString()}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Signups Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                <span className="text-sm sm:text-base">User Signups (Last 30 Days)</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Daily registration trend</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {loading ? (
                <Skeleton className="h-40 sm:h-48 w-full" />
              ) : (
                <div className="space-y-2">
                  {signups.slice(-7).map((day) => (
                    <div key={day.signup_date} className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground w-20 sm:w-24 flex-shrink-0">
                        {new Date(day.signup_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <div className="flex-1 h-3 sm:h-4 bg-muted rounded-full overflow-hidden min-w-0">
                        <div 
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${Math.min((day.count / 10) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right flex-shrink-0">{day.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tier Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                <span className="text-sm sm:text-base">Subscription Distribution</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Users by subscription tier</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {loading ? (
                <Skeleton className="h-40 sm:h-48 w-full" />
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {tierDistribution.map((tier) => {
                    const total = tierDistribution.reduce((sum, t) => sum + t.count, 0);
                    const percentage = total > 0 ? (tier.count / total) * 100 : 0;
                    const colors: Record<string, string> = {
                      FREE: "bg-gray-500",
                      PRO: "bg-blue-500",
                      PRO_MAX: "bg-purple-500",
                    };
                    return (
                      <div key={tier.tier} className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                          <span className="font-medium">{tier.tier}</span>
                          <span className="text-muted-foreground">{tier.count} users ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colors[tier.tier] || "bg-accent"} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
