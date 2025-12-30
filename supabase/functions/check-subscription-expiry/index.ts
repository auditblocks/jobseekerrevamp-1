import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with non-FREE tier and expired subscriptions
    const now = new Date().toISOString();
    
    const { data: expiredUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, name, subscription_tier, subscription_expires_at")
      .neq("subscription_tier", "FREE")
      .not("subscription_expires_at", "is", null)
      .lt("subscription_expires_at", now);

    if (fetchError) {
      console.error("Error fetching expired users:", fetchError);
      throw fetchError;
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No expired subscriptions found",
          count: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Found ${expiredUsers.length} expired subscriptions`);

    // Update expired users to FREE tier
    const userIds = expiredUsers.map(u => u.id);
    
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "FREE",
        subscription_expires_at: null,
        updated_at: now,
      })
      .in("id", userIds);

    if (updateError) {
      console.error("Error updating expired subscriptions:", updateError);
      throw updateError;
    }

    // Create in-app notifications for downgraded users
    const notifications = expiredUsers.map(user => ({
      user_id: user.id,
      title: "Subscription Expired",
      message: `Your ${user.subscription_tier} subscription has expired. You've been downgraded to the FREE tier.`,
      type: "warning",
      metadata: {
        subscription_tier: user.subscription_tier,
        expired_at: user.subscription_expires_at,
      },
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from("user_notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Error creating notifications:", notificationError);
        // Don't throw - notifications are not critical
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully processed ${expiredUsers.length} expired subscriptions`,
        count: expiredUsers.length,
        users: expiredUsers.map(u => ({
          id: u.id,
          email: u.email,
          previous_tier: u.subscription_tier,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in check-subscription-expiry:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString() 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

