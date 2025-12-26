import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, Bell, ChevronRight, Info, AlertTriangle, Gift, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function InAppNotificationPopup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) {
      console.log("[InAppNotification] No user, skipping");
      return;
    }

    console.log("[InAppNotification] User found, fetching notifications for:", user.id);

    const fetchUnreadNotifications = async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      console.log("[InAppNotification] Fetched notifications:", data, error);

      if (!error && data && data.length > 0) {
        setNotifications(data);
        setDismissed(false);
      }
    };

    fetchUnreadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`popup-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[InAppNotification] New notification received:", payload);
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setDismissed(false);
          setCurrentIndex(0);
        }
      )
      .subscribe((status) => {
        console.log("[InAppNotification] Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDismiss = async () => {
    if (notifications[currentIndex]) {
      // Mark current notification as read
      await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notifications[currentIndex].id);
    }

    if (currentIndex < notifications.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setDismissed(true);
    }
  };

  const handleViewAll = () => {
    setDismissed(true);
    navigate("/notifications");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "promo":
        return <Gift className="h-5 w-5 text-purple-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-l-green-500";
      case "warning":
        return "border-l-yellow-500";
      case "promo":
        return "border-l-purple-500";
      default:
        return "border-l-blue-500";
    }
  };

  if (!user || notifications.length === 0 || dismissed) return null;

  const currentNotification = notifications[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
      >
        <div className={`bg-card border border-border rounded-xl shadow-2xl overflow-hidden border-l-4 ${getTypeColor(currentNotification.type)}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">New Notification</span>
              {notifications.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  ({currentIndex + 1}/{notifications.length})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getTypeIcon(currentNotification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground mb-1">
                  {currentNotification.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {currentNotification.message}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleDismiss}
            >
              {currentIndex < notifications.length - 1 ? "Next" : "Dismiss"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleViewAll}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
