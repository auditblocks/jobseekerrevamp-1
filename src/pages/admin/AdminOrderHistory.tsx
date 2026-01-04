import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Receipt, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RotateCcw,
  Loader2,
  IndianRupee,
  Search
} from "lucide-react";
import { toast } from "sonner";

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

const AdminOrderHistory = () => {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const fetchOrderHistory = async () => {
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

  // Filter orders based on search query
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.profiles?.email?.toLowerCase().includes(query) ||
      order.profiles?.name?.toLowerCase().includes(query) ||
      order.razorpay_order_id?.toLowerCase().includes(query) ||
      order.razorpay_payment_id?.toLowerCase().includes(query) ||
      order.subscription_plans?.name?.toLowerCase().includes(query) ||
      order.subscription_plans?.display_name?.toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout>
      <Helmet>
        <title>Order History - Admin | JobSeeker</title>
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Order History</h1>
          </div>
          <p className="text-muted-foreground">
            View all subscription purchases across all users
          </p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
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

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, order ID, payment ID, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "No Orders Found" : "No Orders Yet"}
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No subscription orders have been placed yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
                <CardDescription>
                  Complete purchase history across all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                      {filteredOrders.map((order) => (
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
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOrderHistory;

