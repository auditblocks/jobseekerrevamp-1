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
    try {
      // Use persistent guest_id for anonymous users
      let persistentGuestId = localStorage.getItem("tracking_guest_id");
      if (!persistentGuestId) {
        persistentGuestId = generateSessionToken();
        localStorage.setItem("tracking_guest_id", persistentGuestId);
      }

      // Check for existing active session
      let queryBuilder = supabase
        .from("user_sessions")
        .select("id, session_token")
        .eq("is_active", true);

      if (user?.id) {
        queryBuilder = queryBuilder.eq("user_id", user.id);
      } else if (persistentGuestId) {
        queryBuilder = queryBuilder.eq("guest_id", persistentGuestId).is("user_id", null);
      } else {
        console.warn("No user ID or guest ID for tracking");
        return null;
      }

      const { data: existingSession } = await queryBuilder
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
          user_id: user?.id || null,
          guest_id: user?.id ? null : persistentGuestId,
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
        console.log("Successfully created new session:", newSession.id, user?.id ? "for user" : "for guest");
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
    if (!sessionId) return;

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
        user_id: user?.id || null, // Allow null for guests
        session_id: sessionId,
        event_type: "page_view",
        page_path: pagePath,
        page_title: pageTitle,
      });
    } catch (error) {
      console.error("Error tracking page view:", error);
    }
  };

  // Track click event
  const trackClickEvent = async (
    elementId: string | null,
    elementType: string | null,
    elementText: string | null,
    metadata?: Record<string, any>
  ) => {
    if (!sessionId) return;

    try {
      await supabase.from("user_activity_events").insert({
        user_id: user?.id || null,
        session_id: sessionId,
        event_type: "button_click",
        page_path: location.pathname,
        page_title: document.title,
        element_id: elementId,
        element_type: elementType,
        element_text: elementText,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error("Error tracking click event:", error);
    }
  };

  // Track form submission
  const trackFormSubmit = async (
    formId: string | null,
    formName: string | null,
    metadata?: Record<string, any>
  ) => {
    if (!sessionId) return;

    try {
      await supabase.from("user_activity_events").insert({
        user_id: user?.id || null,
        session_id: sessionId,
        event_type: "form_submit",
        page_path: location.pathname,
        page_title: document.title,
        element_id: formId,
        element_type: "form",
        element_text: formName,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error("Error tracking form submit:", error);
    }
  };

  const updateActivity = async () => {
    if (!sessionId || !isActiveRef.current) return;

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
    console.log("Initializing activity tracking, user:", user?.id || "guest");
    createOrGetSession();

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
    if (sessionId) {
      const pageTitle = document.title || location.pathname;
      pageTitleRef.current = pageTitle;
      trackPageView(location.pathname, pageTitle);
    }
  }, [location.pathname, sessionId]);

  // Set up activity listeners
  useEffect(() => {
    if (!sessionId) return;

    const handleActivity = () => {
      markActive();
    };

    // Listen for various user activities
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Track button clicks with event delegation
    const handleClick = (e: MouseEvent) => {
      markActive();
      const target = e.target as HTMLElement;
      if (!target) return;

      // Track button clicks
      if (target.tagName === "BUTTON" || target.closest("button")) {
        const button = target.tagName === "BUTTON" ? target : target.closest("button");
        if (button) {
          const buttonId = button.id || button.getAttribute("data-id") || null;
          const buttonText = button.textContent?.trim() || null;
          trackClickEvent(buttonId, "button", buttonText, {
            className: button.className,
            ariaLabel: button.getAttribute("aria-label"),
          });
        }
      }

      // Track link clicks
      if (target.tagName === "A" || target.closest("a")) {
        const link = target.tagName === "A" ? target : target.closest("a");
        if (link) {
          const linkId = link.id || link.getAttribute("data-id") || null;
          const linkText = link.textContent?.trim() || null;
          const href = (link as HTMLAnchorElement).href || null;
          trackClickEvent(linkId, "link", linkText, {
            href,
            className: link.className,
          });
        }
      }
    };

    window.addEventListener("click", handleClick, { passive: true });

    // Track form submissions
    const handleFormSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!form) return;

      const formId = form.id || form.getAttribute("data-id") || null;
      const formName = form.name || form.getAttribute("name") || null;
      const formData = new FormData(form);
      const fieldCount = Array.from(formData.keys()).length;

      trackFormSubmit(formId, formName, {
        fieldCount,
        action: form.action,
        method: form.method,
      });
    };

    document.addEventListener("submit", handleFormSubmit, { passive: true });

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
      window.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleFormSubmit);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, sessionId]);

  // Set up heartbeat (update every 30 seconds)
  useEffect(() => {
    if (!sessionId) return;

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

  // Expose functions for external use
  return { endSession, sessionId, trackClickEvent, trackFormSubmit };
}

