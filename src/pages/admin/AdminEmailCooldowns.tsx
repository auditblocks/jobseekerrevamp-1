import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Ban,
  Trash2,
  Loader2,
  Search,
  Clock,
  CheckCircle2,
  Mail,
  User,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

interface EmailCooldown {
  id: string;
  user_id: string;
  recruiter_email: string;
  blocked_until: string;
  email_count: number;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

const AdminEmailCooldowns = () => {
  const [cooldowns, setCooldowns] = useState<EmailCooldown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCooldown, setSelectedCooldown] = useState<EmailCooldown | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingExpired, setIsClearingExpired] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
  });

  const [cooldownDays, setCooldownDays] = useState<number>(7);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  useEffect(() => {
    fetchCooldowns();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "email_cooldown_days")
      .single();

    if (data && data.setting_value) {
      setCooldownDays(Number(data.setting_value));
    }
  };

  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "email_cooldown_days",
          setting_value: cooldownDays,
          description: "Number of days before a user can email the same recruiter again",
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Cooldown configuration updated");
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const fetchCooldowns = async () => {
    setLoading(true);
    try {
      // Fetch all cooldowns with user profile data
      const { data, error } = await supabase
        .from("email_cooldowns")
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich data with user info
      const enrichedData = (data || []).map((cooldown: any) => ({
        ...cooldown,
        user_name: cooldown.profiles?.name || "Unknown",
        user_email: cooldown.profiles?.email || "Unknown",
      }));

      setCooldowns(enrichedData);

      // Calculate stats
      const now = new Date();
      const active = enrichedData.filter(c => new Date(c.blocked_until) > now).length;
      const expired = enrichedData.filter(c => new Date(c.blocked_until) <= now).length;

      setStats({
        total: enrichedData.length,
        active,
        expired,
      });
    } catch (error: any) {
      console.error("Error fetching cooldowns:", error);
      toast.error("Failed to load cooldowns");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCooldown = async () => {
    if (!selectedCooldown) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("email_cooldowns")
        .delete()
        .eq("id", selectedCooldown.id);

      if (error) throw error;

      toast.success("Cooldown removed successfully");
      fetchCooldowns();
    } catch (error: any) {
      console.error("Error deleting cooldown:", error);
      toast.error("Failed to delete cooldown");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedCooldown(null);
    }
  };

  const handleClearExpired = async () => {
    setIsClearingExpired(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("email_cooldowns")
        .delete()
        .lt("blocked_until", now)
        .select("id");

      if (error) throw error;

      const count = data?.length || 0;
      toast.success(`Cleared ${count} expired cooldown(s)`);
      fetchCooldowns();
    } catch (error: any) {
      console.error("Error clearing expired cooldowns:", error);
      toast.error("Failed to clear expired cooldowns");
    } finally {
      setIsClearingExpired(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
  };

  const getCooldownStatus = (blockedUntil: string) => {
    const blockedDate = new Date(blockedUntil);
    const now = new Date();

    if (blockedDate <= now) {
      return {
        label: "Expired",
        variant: "secondary" as const,
        icon: CheckCircle2,
        className: "bg-muted text-muted-foreground",
        daysRemaining: 0,
      };
    }

    const daysRemaining = Math.ceil((blockedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      label: `Active (${daysRemaining}d left)`,
      variant: "destructive" as const,
      icon: Ban,
      className: "bg-destructive/10 text-destructive border-destructive/20",
      daysRemaining,
    };
  };

  const filteredCooldowns = cooldowns.filter((cooldown) => {
    const query = searchQuery.toLowerCase();
    return (
      cooldown.user_name?.toLowerCase().includes(query) ||
      cooldown.user_email?.toLowerCase().includes(query) ||
      cooldown.recruiter_email.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Helmet>
        <title>Email Cooldowns | Admin</title>
        <meta name="description" content="Manage email cooldowns to prevent recruiter spam" />
      </Helmet>

      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Ban className="h-8 w-8" />
                  Email Cooldowns
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage email cooldowns to prevent recruiter spam
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleClearExpired}
                disabled={isClearingExpired || stats.expired === 0}
              >
                {isClearingExpired ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Clear Expired ({stats.expired})
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-primary/5 border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cooldown Setting</CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={cooldownDays}
                      onChange={(e) => setCooldownDays(parseInt(e.target.value) || 0)}
                      className="h-8 w-20 text-lg font-bold bg-background"
                    />
                    <span className="text-sm font-medium">days</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 ml-auto"
                      onClick={handleUpdateSettings}
                      disabled={isUpdatingSettings}
                    >
                      {isUpdatingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cooldowns</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Cooldowns</CardTitle>
                  <Ban className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.active}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expired Cooldowns</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Cooldowns Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Cooldowns</CardTitle>
                    <CardDescription>
                      All email cooldowns with user and recruiter information
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users or recruiters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCooldowns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cooldowns found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Recruiter Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Blocked Until</TableHead>
                        <TableHead>Email Count</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCooldowns.map((cooldown) => {
                        const status = getCooldownStatus(cooldown.blocked_until);
                        const StatusIcon = status.icon;

                        return (
                          <TableRow key={cooldown.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {cooldown.user_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {cooldown.user_email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {cooldown.recruiter_email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className={status.className}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {formatDateTime(cooldown.blocked_until)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{cooldown.email_count}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {formatDateTime(cooldown.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCooldown(cooldown);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AdminLayout>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Cooldown?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow <strong>{selectedCooldown?.user_name}</strong> to immediately email{" "}
              <strong>{selectedCooldown?.recruiter_email}</strong> again.
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCooldown}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Cooldown"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminEmailCooldowns;
