import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Plus, RefreshCw, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Campaign {
  id: string;
  subject: string;
  html_body: string;
  target_type: string;
  target_filters: any;
  status: string;
  total_recipients: number | null;
  sent_count: number | null;
  created_at: string | null;
}

export default function AdminNotifications() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    target: "all", // all, free, pro (UI values)
    type: "info",
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Failed to fetch campaigns:", error);
      toast.error("Failed to fetch notification history");
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Map UI target to valid database target_type
      const targetType = newNotification.target === "all" ? "all" : "subscription_tier";
      const targetFilters = newNotification.target === "free" 
        ? { subscription_tier: "FREE" }
        : newNotification.target === "pro"
        ? { subscription_tier: "PRO" }
        : {};

      // Create the campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from("notification_campaigns")
        .insert({
          subject: newNotification.title,
          html_body: newNotification.message,
          target_type: targetType,
          target_filters: targetFilters,
          status: "sending",
          created_by: user.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Get target users
      let usersQuery = supabase.from("profiles").select("id, email, name");
      
      if (newNotification.target === "free") {
        usersQuery = usersQuery.eq("subscription_tier", "FREE");
      } else if (newNotification.target === "pro") {
        usersQuery = usersQuery.neq("subscription_tier", "FREE");
      }

      const { data: users, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      // Create in-app notifications for each user
      const notifications = (users || []).map((u) => ({
        user_id: u.id,
        campaign_id: campaign.id,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
      }));

      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from("user_notifications")
          .insert(notifications);

        if (notifError) throw notifError;
      }

      // Update campaign with recipient count
      await supabase
        .from("notification_campaigns")
        .update({
          status: "completed",
          total_recipients: notifications.length,
          sent_count: notifications.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      toast.success(`Notification sent to ${notifications.length} users`);
      setIsCreateDialogOpen(false);
      setNewNotification({ title: "", message: "", target: "all", type: "info" });
      fetchCampaigns();
    } catch (error: any) {
      console.error("Failed to send notification:", error);
      toast.error(error.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500">Completed</Badge>;
      case "sending":
        return <Badge className="bg-blue-500/10 text-blue-500">Sending</Badge>;
      case "failed":
        return <Badge className="bg-destructive/10 text-destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTargetLabel = (targetType: string, targetFilters?: any) => {
    if (targetType === "all") return "All Users";
    if (targetType === "subscription_tier") {
      const tier = targetFilters?.subscription_tier;
      if (tier === "FREE") return "Free Users";
      if (tier === "PRO") return "Pro Users";
      return "Subscription Filter";
    }
    return targetType;
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Notifications | Admin</title>
      </Helmet>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">Send in-app notifications to users</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchCampaigns} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={newNotification.title}
                      onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                      placeholder="Notification title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={newNotification.message}
                      onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                      placeholder="Notification message..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Select
                        value={newNotification.target}
                        onValueChange={(value) => setNewNotification({ ...newNotification, target: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="free">Free Users</SelectItem>
                          <SelectItem value="pro">Pro Users</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newNotification.type}
                        onValueChange={(value) => setNewNotification({ ...newNotification, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="promo">Promotion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={sendNotification}
                    disabled={!newNotification.title || !newNotification.message || sending}
                    className="w-full"
                  >
                    {sending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {sending ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No notifications sent yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.subject}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {campaign.html_body}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {getTargetLabel(campaign.target_type, campaign.target_filters)}
                          </Badge>
                        </TableCell>
                        <TableCell>{campaign.total_recipients || 0}</TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          {campaign.created_at ? format(new Date(campaign.created_at), "MMM d, yyyy HH:mm") : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
