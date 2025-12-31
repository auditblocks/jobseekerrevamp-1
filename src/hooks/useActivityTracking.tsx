import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Device detection utilities
const detectDeviceType = (): "mobile" | "desktop" | "tablet" => {
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

const detectBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Unknown";
};

// Generate unique session token
const generateSessionToken = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export function useActivityTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);
  const pageTitleRef = useRef<string>(document.title);

  // Create or get active session
  const createOrGetSession = async (): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      // Check for existing active session
      const { data: existingSession } = await supabase
        .from("user_sessions")
        .select("id, session_token")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        setSessionId(existingSession.id);
        return existingSession.id;
      }

      // Create new session
      const sessionToken = generateSessionToken();
      const deviceType = detectDeviceType();
      const browser = detectBrowser();
      const userAgent = navigator.userAgent;

      const { data: newSession, error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          device_type: deviceType,
          browser: browser,
          user_agent: userAgent,
          is_active: true,
          last_activity_at: new Date().toISOString(),
          current_page: location.pathname,
          current_page_title: document.title,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating session:", error);
        return null;
      }

      if (newSession) {
        setSessionId(newSession.id);
        return newSession.id;
      }
    } catch (error) {
      console.error("Error in createOrGetSession:", error);
    }

    return null;
  };

  // Track page view
  const trackPageView = async (pagePath: string, pageTitle: string) => {
    if (!user?.id || !sessionId) return;

    try {
      // Update session with current page
      await supabase
        .from("user_sessions")
        .update({
          current_page: pagePath,
          current_page_title: pageTitle,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // Create page view event
      await supabase.from("user_activity_events").insert({
        user_id: user.id,
        session_id: sessionId,
        event_type: "page_view",
        page_path: pagePath,
        page_title: pageTitle,
      });
    } catch (error) {
      console.error("Error tracking page view:", error);
    }
  };

  // Update activity heartbeat
  const updateActivity = async () => {
    if (!user?.id || !sessionId || !isActiveRef.current) return;

    try {
      await supabase
        .from("user_sessions")
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  // Mark user as active
  const markActive = () => {
    lastActivityRef.current = Date.now();
    if (!isActiveRef.current) {
      isActiveRef.current = true;
    }
  };

  // End session
  const endSession = async (reason: "logout" | "timeout" | "close" | "error" = "close") => {
    if (!sessionId) return;

    const endData = {
      is_active: false,
      ended_at: new Date().toISOString(),
      exit_reason: reason,
      exit_page: location.pathname,
      duration_seconds: Math.floor((Date.now() - lastActivityRef.current) / 1000),
    };

    // Use sendBeacon for reliable session end on page close
    if (navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({ session_id: sessionId, ...endData })],
        { type: "application/json" }
      );
      // Note: sendBeacon requires an endpoint, so we'll also do a regular update
    }

    try {
      await supabase
        .from("user_sessions")
        .update(endData)
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error ending session:", error);
    }

    setSessionId(null);
  };

  // Initialize session on mount
  useEffect(() => {
    if (user?.id) {
      createOrGetSession();
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [user?.id]);

  // Track page views on route change
  useEffect(() => {
    if (sessionId && user?.id) {
      const pageTitle = document.title || location.pathname;
      pageTitleRef.current = pageTitle;
      trackPageView(location.pathname, pageTitle);
    }
  }, [location.pathname, sessionId, user?.id]);

  // Set up activity listeners
  useEffect(() => {
    if (!user?.id) return;

    const handleActivity = () => {
      markActive();
    };

    // Listen for various user activities
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Page visibility API
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markActive();
        updateActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id]);

  // Set up heartbeat (update every 30 seconds)
  useEffect(() => {
    if (!sessionId || !user?.id) return;

    heartbeatIntervalRef.current = setInterval(() => {
      // Only update if user has been active in last 2 minutes
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity < 120000) {
        updateActivity();
      } else {
        // Mark as inactive if no activity for 5+ minutes
        if (timeSinceLastActivity > 300000) {
          isActiveRef.current = false;
          endSession("timeout");
        }
      }
    }, 30000); // 30 seconds

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [sessionId, user?.id]);

  // Handle page unload (tab close, navigation away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId) {
        endSession("close");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (sessionId) {
        endSession("close");
      }
    };
  }, [sessionId]);

  // Expose endSession for logout
  return { endSession, sessionId };
}

