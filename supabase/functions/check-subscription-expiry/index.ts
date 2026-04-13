/**
 * @module check-subscription-expiry
 * @description Supabase Edge Function (intended to be invoked on a cron schedule)
 * that detects and downgrades expired paid subscriptions. The workflow:
 *
 *   1. Query all `profiles` where `subscription_tier != 'FREE'` and
 *      `subscription_expires_at < now()`.
 *   2. Batch-update those profiles back to the FREE tier and clear the expiry.
 *   3. Create in-app `user_notifications` to inform affected users about the
 *      downgrade (non-blocking — notification failures don't abort the process).
 *
 * Returns a summary of processed users for observability / cron-job logging.
 *
 * @requires SUPABASE_URL
 * @requires SUPABASE_SERVICE_ROLE_KEY
 */
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

    // Find all paid users whose subscription_expires_at has passed.
    // The three filters together ensure we only touch rows that genuinely need downgrading:
    //   - tier != FREE  → skip users already on free
    //   - expires_at IS NOT NULL → skip lifetime / manually-managed accounts
    //   - expires_at < now → only truly expired
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

    // Batch downgrade: reset tier to FREE and clear expiry so they won't be
    // picked up again on the next cron run
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

