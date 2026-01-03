import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { 
  Receipt, 
  ArrowLeft, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RotateCcw,
  Loader2,
  IndianRupee,
  Calendar,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEO/SEOHead";

interface OrderHistoryItem {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_method: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string | null;
  profiles: {
    name: string | null;
    email: string;
  } | null;
  subscription_plans: {
    name: string;
    display_name: string | null;
    duration_days: number;
  } | null;
}

const OrderHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.id) {
      fetchOrderHistory();
    }
  }, [user?.id]);

  const fetchOrderHistory = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscription_history")
        .select(`
          *,
          profiles:user_id (
            name,
            email
          ),
          subscription_plans:plan_id (
            name,
            display_name,
            duration_days
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);

      // Calculate stats
      const totalOrders = data?.length || 0;
      const completedOrders = data?.filter((o) => o.status === "completed").length || 0;
      const totalSpent = data?.reduce((sum, o) => {
        if (o.status === "completed") {
          return sum + (o.amount || 0);
        }
        return sum;
      }, 0) || 0;

      setStats({
        totalOrders,
        completedOrders,
        totalSpent,
      });
    } catch (error: any) {
      console.error("Error fetching order history:", error);
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amountInPaise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amountInPaise / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        label: "Completed",
        variant: "default" as const,
        icon: CheckCircle2,
        className: "bg-green-500 hover:bg-green-600",
      },
      pending: {
        label: "Pending",
        variant: "secondary" as const,
        icon: Clock,
        className: "bg-yellow-500 hover:bg-yellow-600",
      },
      failed: {
        label: "Failed",
        variant: "destructive" as const,
        icon: XCircle,
        className: "bg-red-500 hover:bg-red-600",
      },
      refunded: {
        label: "Refunded",
        variant: "outline" as const,
        icon: RotateCcw,
        className: "border-orange-500 text-orange-500",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <>
        <SEOHead
          title="Order History | JobSeeker"
          description="View your subscription purchase history and order details"
        />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
              <div className="h-4 w-96 bg-muted animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <>
      <SEOHead
        title="Order History | JobSeeker"
        description="View your subscription purchase history and order details"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Receipt className="h-8 w-8" />
                  Order History
                </h1>
                <p className="text-muted-foreground mt-1">
                  View all your subscription purchases and receipts
                </p>
              </div>
            </div>
          </motion.div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
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
                  <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{stats.completedOrders}</div>
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
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalSpent)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Orders Table */}
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    You haven't made any subscription purchases yet. Browse our plans to get started.
                  </p>
                  <Button onClick={() => navigate("/subscription")}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Desktop Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="hidden md:block"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Purchase History</CardTitle>
                    <CardDescription>
                      All your subscription orders and payment details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Purchase Date</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Payment ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                              {order.razorpay_order_id || order.id.substring(0, 8)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {order.profiles?.name || "N/A"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {order.profiles?.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.subscription_plans?.display_name || 
                               order.subscription_plans?.name || 
                               order.plan_id}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(order.amount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>
                              {formatDateTime(order.created_at)}
                            </TableCell>
                            <TableCell>
                              {order.expires_at ? formatDate(order.expires_at) : "N/A"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {order.razorpay_payment_id || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Mobile Card Layout */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="md:hidden space-y-4"
              >
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {order.subscription_plans?.display_name || 
                             order.subscription_plans?.name || 
                             order.plan_id}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Order: {order.razorpay_order_id || order.id.substring(0, 8)}
                          </CardDescription>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-semibold">{formatCurrency(order.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Purchase Date</span>
                        <span>{formatDateTime(order.created_at)}</span>
                      </div>
                      {order.expires_at && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Expiry Date</span>
                          <span>{formatDate(order.expires_at)}</span>
                        </div>
                      )}
                      {order.razorpay_payment_id && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Payment ID</span>
                          <span className="font-mono text-xs">{order.razorpay_payment_id}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderHistory;

