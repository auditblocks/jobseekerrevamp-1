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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, RefreshCw, User, Mail, Calendar, Crown, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  subscription_tier: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_all_users");
      if (error) throw error;
      setUsers(data as UserData[]);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`User status updated to ${status}`);
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to update user status");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesTier = tierFilter === "all" || user.subscription_tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PRO_MAX":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "PRO":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "suspended":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "banned":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const fetchUserActivity = async (userId: string) => {
    setLoadingActivity(true);
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

      setUserActivity((activityRes.data || []) as any[]);
      setUserSessions((sessionsRes.data || []) as any[]);
    } catch (error: any) {
      console.error("Error fetching user activity:", error);
      toast.error("Failed to fetch user activity");
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleViewActivity = (userId: string) => {
    setSelectedUserId(userId);
    setIsActivityDialogOpen(true);
    fetchUserActivity(userId);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>User Management | Admin</title>
      </Helmet>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage all registered users</p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
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

        {/* Users Table */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">User</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Subscription</TableHead>
                    <TableHead className="min-w-[120px]">Joined</TableHead>
                    <TableHead className="min-w-[120px]">Last Active</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-accent" />
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-1">
                                {user.name}
                                {user.role === "superadmin" && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTierColor(user.subscription_tier)}>
                            {user.subscription_tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(user.created_at), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_sign_in_at ? (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(user.last_sign_in_at), "MMM d, yyyy")}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewActivity(user.id)}
                              className="h-8"
                            >
                              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Select
                              value={user.status}
                              onValueChange={(value) => updateUserStatus(user.id, value)}
                            >
                              <SelectTrigger className="w-[100px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="suspended">Suspend</SelectItem>
                                <SelectItem value="banned">Ban</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* User Activity Dialog */}
        <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Activity</DialogTitle>
              <DialogDescription>
                {users.find(u => u.id === selectedUserId)?.name} ({users.find(u => u.id === selectedUserId)?.email})
              </DialogDescription>
            </DialogHeader>

            {loadingActivity ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
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
                        userActivity.map((activity: any) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 p-2 sm:p-3 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors"
                          >
                            <Activity className="h-4 w-4 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs sm:text-sm capitalize">
                                  {activity.event_type?.replace("_", " ") || "Event"}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.page_path || "—"}
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
                        userSessions.map((session: any) => (
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
                                  {Math.floor(session.duration_seconds / 60)}m
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
