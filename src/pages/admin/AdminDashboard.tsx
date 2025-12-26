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

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform metrics</p>
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
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                )}
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Signups Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                User Signups (Last 30 Days)
              </CardTitle>
              <CardDescription>Daily registration trend</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-2">
                  {signups.slice(-7).map((day) => (
                    <div key={day.signup_date} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-24">
                        {new Date(day.signup_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${Math.min((day.count / 10) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{day.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-accent" />
                Subscription Distribution
              </CardTitle>
              <CardDescription>Users by subscription tier</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-4">
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
                        <div className="flex justify-between text-sm">
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
