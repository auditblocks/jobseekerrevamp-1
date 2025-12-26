import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, RefreshCw, IndianRupee, Calendar, User, Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

interface SubscriptionHistory {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: string;
  created_at: string;
  expires_at: string | null;
  razorpay_payment_id: string | null;
  profiles?: { name: string; email: string };
  subscription_plans?: { name: string; display_name: string };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  price: number;
  old_price: number | null;
  duration_days: number;
  duration_unit: string;
  daily_limit: number;
  features: string[];
  is_active: boolean;
  is_recommended: boolean;
  sort_order: number;
  billing_cycle_display: string | null;
  button_text: string | null;
}

const defaultPlan: Partial<SubscriptionPlan> = {
  name: "",
  display_name: "",
  description: "",
  price: 0,
  old_price: null,
  duration_days: 30,
  duration_unit: "days",
  daily_limit: 5,
  features: [],
  is_active: true,
  is_recommended: false,
  sort_order: 0,
  billing_cycle_display: "/month",
  button_text: "Get Started",
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionHistory[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, revenue: 0 });
  
  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch subscription history with user and plan info
      const { data: historyData, error: historyError } = await supabase
        .from("subscription_history")
        .select(`
          *,
          profiles:user_id(name, email),
          subscription_plans:plan_id(name, display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      setSubscriptions(historyData || []);

      // Calculate stats
      const completedSubs = (historyData || []).filter((s) => s.status === "completed");
      setStats({
        total: (historyData || []).length,
        active: completedSubs.filter((s) => s.expires_at && new Date(s.expires_at) > new Date())
          .length,
        revenue: completedSubs.reduce((sum, s) => sum + (s.amount || 0), 0),
      });

      // Fetch plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      setPlans(plansData || []);
    } catch (error: any) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const openEditDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFeaturesText(plan.features.join("\n"));
    } else {
      setEditingPlan({ ...defaultPlan, id: `plan_${Date.now()}` });
      setFeaturesText("");
    }
    setIsEditOpen(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    
    setIsSaving(true);
    try {
      const features = featuresText.split("\n").filter(f => f.trim());
      const planData = {
        ...editingPlan,
        features,
      };

      // Check if plan exists
      const { data: existing } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("id", editingPlan.id)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", editingPlan.id);
        if (error) throw error;
        toast.success("Plan updated successfully");
      } else {
        // Insert
        const { error } = await supabase
          .from("subscription_plans")
          .insert([planData as any]);
        if (error) throw error;
        toast.success("Plan created successfully");
      }

      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Failed to save plan:", error);
      toast.error("Failed to save plan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", planId);
      
      if (error) throw error;
      toast.success("Plan deleted successfully");
      fetchData();
    } catch (error: any) {
      console.error("Failed to delete plan:", error);
      toast.error("Failed to delete plan: " + error.message);
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Subscriptions | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscription Management</h1>
            <p className="text-muted-foreground">Manage plans and view subscription orders</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="h-5 w-5" />
                {stats.revenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subscription Plans</CardTitle>
            <Button onClick={() => openEditDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-4 rounded-lg border relative group ${
                    plan.is_recommended ? "border-accent bg-accent/5" : ""
                  } ${!plan.is_active ? "opacity-60" : ""}`}
                >
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{plan.display_name || plan.name}</h3>
                    <div className="flex gap-1">
                      {!plan.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                      )}
                      {plan.is_recommended && (
                        <Badge className="bg-accent text-accent-foreground">Recommended</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    ₹{plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      {plan.billing_cycle_display || `/${plan.duration_days} days`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i}>• {feature}</li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-accent">+{plan.features.length - 4} more</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{sub.profiles?.name || "Unknown"}</div>
                              <div className="text-sm text-muted-foreground">
                                {sub.profiles?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sub.subscription_plans?.display_name || sub.plan_id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {sub.amount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(sub.status)}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(sub.created_at), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.expires_at ? (
                            <span
                              className={`text-sm ${
                                new Date(sub.expires_at) < new Date()
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {format(new Date(sub.expires_at), "MMM d, yyyy")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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

      {/* Edit Plan Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan?.id?.startsWith("plan_") && !plans.find(p => p.id === editingPlan.id)
                ? "Create New Plan"
                : "Edit Plan"}
            </DialogTitle>
          </DialogHeader>
          
          {editingPlan && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-id">Plan ID</Label>
                  <Input
                    id="plan-id"
                    value={editingPlan.id || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, id: e.target.value })}
                    placeholder="e.g., FREE, PRO, PRO_MAX"
                    disabled={plans.find(p => p.id === editingPlan.id) !== undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Internal Name</Label>
                  <Input
                    id="plan-name"
                    value={editingPlan.name || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g., Free, Pro, Pro Max"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={editingPlan.display_name || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, display_name: e.target.value })}
                    placeholder="e.g., Free Plan, Pro Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-cycle">Billing Cycle Display</Label>
                  <Input
                    id="billing-cycle"
                    value={editingPlan.billing_cycle_display || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, billing_cycle_display: e.target.value })}
                    placeholder="e.g., /month, /year, forever"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editingPlan.description || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="Brief description of the plan"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editingPlan.price || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="old-price">Old Price (₹)</Label>
                  <Input
                    id="old-price"
                    type="number"
                    value={editingPlan.old_price || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, old_price: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="For strikethrough"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={editingPlan.duration_days || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, duration_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-limit">Daily Email Limit</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={editingPlan.daily_limit || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, daily_limit: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort-order">Sort Order</Label>
                  <Input
                    id="sort-order"
                    type="number"
                    value={editingPlan.sort_order || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="button-text">Button Text</Label>
                  <Input
                    id="button-text"
                    value={editingPlan.button_text || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, button_text: e.target.value })}
                    placeholder="e.g., Get Started"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="5 emails per day&#10;Basic templates&#10;Email tracking"
                  rows={6}
                />
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is-active"
                    checked={editingPlan.is_active || false}
                    onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_active: checked })}
                  />
                  <Label htmlFor="is-active">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is-recommended"
                    checked={editingPlan.is_recommended || false}
                    onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_recommended: checked })}
                  />
                  <Label htmlFor="is-recommended">Recommended</Label>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}