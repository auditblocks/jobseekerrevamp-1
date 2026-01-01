import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Eye, 
  Monitor, 
  Smartphone, 
  Tablet,
  Globe,
  Clock,
  User,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ActiveSession {
  session_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subscription_tier: string;
  session_token: string;
  started_at: string;
  last_activity_at: string;
  current_page: string | null;
  current_page_title: string | null;
  device_type: string | null;
  browser: string | null;
  ip_address: string | null;
  session_duration_seconds: number;
  is_online: boolean;
}

interface UserActivity {
  id: string;
  event_type: string;
  page_path: string;
  page_title: string | null;
  event_name: string | null;
  element_id: string | null;
  element_type: string | null;
  element_text: string | null;
  metadata: any;
  created_at: string;
}

interface UserSession {
  id: string;
  session_token: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  device_type: string | null;
  browser: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  exit_page: string | null;
  exit_reason: string | null;
  current_page: string | null;
  current_page_title: string | null;
  last_activity_at: string;
  metadata: any;
}

export default function AdminUserActivity() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<ActiveSession | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 30000);

    // Set up Realtime subscription
    const channel = supabase
      .channel("user-sessions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_sessions",
        },
        () => {
          // Refetch data when sessions change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch online users count
      const { data: onlineCountData } = await (supabase.rpc as any)("get_online_users_count");
      setOnlineCount(onlineCountData || 0);

      // Fetch active sessions
      const { data: sessionsData, error } = await (supabase.rpc as any)("admin_get_active_sessions");
      
      if (error) {
        console.error("Error fetching sessions:", error);
        toast.error("Failed to fetch active sessions");
        return;
      }

      setSessions((sessionsData as ActiveSession[]) || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch user activity data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const [activityRes, sessionsRes] = await Promise.all([
        (supabase.rpc as any)("admin_get_user_activity", { 
          p_user_id: userId, 
          p_limit: 50 
        }),
        (supabase.rpc as any)("admin_get_user_sessions", { 
          p_user_id: userId, 
          p_limit: 20 
        }),
      ]);

      if (activityRes.error) throw activityRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      setUserActivity((activityRes.data as UserActivity[]) || []);
      setUserSessions((sessionsRes.data as UserSession[]) || []);
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to fetch user activity details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (session: ActiveSession) => {
    setSelectedUser(session);
    setIsDetailDialogOpen(true);
    fetchUserDetails(session.user_id);
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "online" && session.is_online) ||
      (statusFilter === "offline" && !session.is_online);
    
    const matchesDevice = 
      deviceFilter === "all" || 
      session.device_type === deviceFilter;
    
    const matchesTier = 
      tierFilter === "all" || 
      session.subscription_tier === tierFilter;

    return matchesSearch && matchesStatus && matchesDevice && matchesTier;
  });

  const deviceMix = sessions.reduce((acc, session) => {
    const type = session.device_type || "unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSessions = sessions.length;
  const deviceMixPercentages = {
    desktop: totalSessions > 0 ? ((deviceMix.desktop || 0) / totalSessions * 100).toFixed(1) : "0",
    mobile: totalSessions > 0 ? ((deviceMix.mobile || 0) / totalSessions * 100).toFixed(1) : "0",
    tablet: totalSessions > 0 ? ((deviceMix.tablet || 0) / totalSessions * 100).toFixed(1) : "0",
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "page_view":
        return <Globe className="h-4 w-4" />;
      case "click":
        return <Activity className="h-4 w-4" />;
      case "form_submit":
        return <User className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>User Activity | Admin</title>
      </Helmet>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">User Activity</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Monitor user activity in real-time
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  • Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              )}
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                Online Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{onlineCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Active in last 5 minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Total active sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Monitor className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                Desktop
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{deviceMixPercentages.desktop}%</div>
              <p className="text-xs text-muted-foreground mt-1">{deviceMix.desktop || 0} users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                Mobile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{deviceMixPercentages.mobile}%</div>
              <p className="text-xs text-muted-foreground mt-1">{deviceMix.mobile || 0} users</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full sm:w-[150px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger className="w-full sm:w-[150px] text-sm">
                  <SelectValue placeholder="Device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-full sm:w-[150px] text-sm">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="PRO_MAX">Pro Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions Table */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Active Sessions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Real-time user activity monitoring</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">User</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[200px]">Current Page</TableHead>
                    <TableHead className="min-w-[100px]">Device</TableHead>
                    <TableHead className="min-w-[100px]">Browser</TableHead>
                    <TableHead className="min-w-[120px]">Last Activity</TableHead>
                    <TableHead className="min-w-[100px]">Duration</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No active sessions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => (
                      <TableRow key={session.session_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-accent/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-accent" />
                            </div>
                            <div>
                              <div className="font-medium text-sm sm:text-base">{session.user_name || "Unknown"}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">{session.user_email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                session.is_online ? "bg-green-500" : "bg-gray-400"
                              }`}
                            />
                            <span className="text-xs sm:text-sm">
                              {session.is_online ? "Online" : "Offline"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <div className="font-medium text-xs sm:text-sm truncate">
                              {session.current_page_title || session.current_page || "—"}
                            </div>
                            {session.current_page && (
                              <div className="text-xs text-muted-foreground truncate">
                                {session.current_page}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {session.device_type === "desktop" && <Monitor className="h-4 w-4 text-purple-500" />}
                            {session.device_type === "mobile" && <Smartphone className="h-4 w-4 text-orange-500" />}
                            {session.device_type === "tablet" && <Tablet className="h-4 w-4 text-blue-500" />}
                            <span className="text-xs sm:text-sm capitalize">
                              {session.device_type || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs sm:text-sm">{session.browser || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs sm:text-sm">
                            {formatDuration(session.session_duration_seconds)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(session)}
                            className="text-xs sm:text-sm"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">View Details</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* User Activity Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Activity Details</DialogTitle>
              <DialogDescription>
                {selectedUser?.user_name} ({selectedUser?.user_email})
              </DialogDescription>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overview Card */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Current Session</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Current Page</div>
                        <div className="font-medium text-sm sm:text-base">
                          {selectedUser?.current_page_title || selectedUser?.current_page || "—"}
                        </div>
                        {selectedUser?.current_page && (
                          <div className="text-xs text-muted-foreground">{selectedUser.current_page}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Status</div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              selectedUser?.is_online ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          <span className="text-sm sm:text-base">
                            {selectedUser?.is_online ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Session Started</div>
                        <div className="text-sm sm:text-base">
                          {selectedUser?.started_at
                            ? format(new Date(selectedUser.started_at), "MMM d, yyyy 'at' h:mm a")
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Session Duration</div>
                        <div className="text-sm sm:text-base">
                          {selectedUser
                            ? formatDuration(selectedUser.session_duration_seconds)
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Device</div>
                        <div className="text-sm sm:text-base capitalize">
                          {selectedUser?.device_type || "—"} / {selectedUser?.browser || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">IP Address</div>
                        <div className="text-sm sm:text-base">{selectedUser?.ip_address || "—"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Log */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Last 50 events</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {userActivity.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No activity recorded
                        </div>
                      ) : (
                        userActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 p-2 sm:p-3 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors"
                          >
                            <div className="mt-0.5">{getEventIcon(activity.event_type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs sm:text-sm capitalize">
                                  {activity.event_type.replace("_", " ")}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.page_path}
                                </Badge>
                              </div>
                              {activity.page_title && (
                                <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                                  {activity.page_title}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm:ss a")}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Session History */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Session History</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Last 20 sessions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {userSessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No session history
                        </div>
                      ) : (
                        userSessions.map((session) => (
                          <div
                            key={session.id}
                            className="p-2 sm:p-3 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={session.is_active ? "default" : "outline"} className="text-xs">
                                  {session.is_active ? "Active" : "Ended"}
                                </Badge>
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  {format(new Date(session.started_at), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              </div>
                              {session.duration_seconds && (
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  {formatDuration(session.duration_seconds)}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                              <div>
                                <span className="text-muted-foreground">Device: </span>
                                <span className="capitalize">{session.device_type || "—"}</span>
                                {session.browser && <span> / {session.browser}</span>}
                              </div>
                              {session.exit_reason && (
                                <div>
                                  <span className="text-muted-foreground">Exit: </span>
                                  <span className="capitalize">{session.exit_reason}</span>
                                </div>
                              )}
                              {session.current_page && (
                                <div className="sm:col-span-2">
                                  <span className="text-muted-foreground">Last Page: </span>
                                  <span>{session.current_page_title || session.current_page}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

