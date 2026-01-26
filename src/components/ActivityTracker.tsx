import { useEffect, useRef } from "react";
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

  // Handle logout - end session only if we had a user and now we don't
  const prevUserRef = useRef(user);

  useEffect(() => {
    if (prevUserRef.current && !user && sessionId) {
      // User logged out, end the authenticated session
      endSession("logout");
    }
    prevUserRef.current = user;
  }, [user, sessionId, endSession]);

  // Component doesn't render anything
  return null;
}

