import { useEffect } from "react";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useAuth } from "@/hooks/useAuth";

/**
 * ActivityTracker Component
 * Wrapper component that activates user activity tracking
 * Only tracks when user is authenticated
 */
export function ActivityTracker() {
  const { user } = useAuth();
  const { endSession, sessionId } = useActivityTracking();

  // Handle logout - end session
  useEffect(() => {
    if (!user && sessionId) {
      // User logged out, end session
      endSession("logout");
    }
  }, [user, sessionId, endSession]);

  // Component doesn't render anything
  return null;
}

