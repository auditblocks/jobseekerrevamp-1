import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  isSuperadmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  isSuperadmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    // Handle OAuth callback - process hash tokens if present
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        // OAuth callback detected - get session to process hash tokens
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("OAuth callback error:", error);
            return;
          }
          
          if (session) {
            // Clear the hash from URL
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
        } catch (error) {
          console.error("Error processing OAuth callback:", error);
        }
      }
    };

    // Process OAuth callback first
    handleOAuthCallback();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch
        if (session?.user) {
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            await checkSuperadmin(session.user.id);
          }, 100); // Small delay to ensure database is ready
        } else {
          setProfile(null);
          setIsSuperadmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        checkSuperadmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    // Check if subscription has expired (on-demand check)
    if (data && data.subscription_tier !== "FREE" && data.subscription_expires_at) {
      const expiresAt = new Date(data.subscription_expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        // Store old tier for notification
        const oldTier = data.subscription_tier;
        
        // Subscription expired - update to FREE tier immediately
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_tier: "FREE",
            subscription_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (!updateError) {
          // Update local profile data
          data.subscription_tier = "FREE";
          data.subscription_expires_at = null;
          
          // Create notification for expired subscription
          await supabase
            .from("user_notifications")
            .insert({
              user_id: userId,
              title: "Subscription Expired",
              message: `Your ${oldTier} subscription has expired. You've been downgraded to the FREE tier.`,
              type: "warning",
              metadata: {
                subscription_tier: oldTier,
                expired_at: data.subscription_expires_at,
              },
            });
        }
      }
    }
    
    setProfile(data);
  };

  const checkSuperadmin = async (userId: string) => {
    try {
      // Check user_roles table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      // Also check profile role
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      // Check is_superadmin function
      const { data: isSuperadminData } = await supabase.rpc("is_superadmin");
      
      const hasAdminRole = !!roleData;
      const hasSuperadminProfile = profileData?.role === 'superadmin';
      const isSuperadminFromRPC = !!isSuperadminData;
      
      setIsSuperadmin(hasAdminRole || hasSuperadminProfile || isSuperadminFromRPC);
    } catch (error) {
      console.error("Error checking superadmin status:", error);
      setIsSuperadmin(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsSuperadmin(false);
  };

  // Public function to refresh profile (e.g., after subscription upgrade)
  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isSuperadmin, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
