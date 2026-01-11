import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_DAYS = 7;

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  recruiterName?: string;
  attachResume?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile with Gmail token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (!profile.google_refresh_token) {
      throw new Error("Gmail not connected. Please connect your Gmail account first.");
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = profile.subscription_tier === "FREE" ? 5 :
      profile.subscription_tier === "PRO" ? 50 : 1000;

    if (profile.last_sent_date === today && profile.daily_emails_sent >= dailyLimit) {
      throw new Error(`Daily email limit (${dailyLimit}) reached. Upgrade to send more emails.`);
    }

    const { to, subject, body, recruiterName }: EmailRequest = await req.json();

    // CHECK COOLDOWN - Prevent spamming same recruiter
    const now = new Date().toISOString();
    const recruiterEmailLower = to.toLowerCase();

    const { data: cooldownRecord, error: cooldownError } = await supabase
      .from("email_cooldowns")
      .select("*")
      .eq("user_id", user.id)
      .eq("recruiter_email", recruiterEmailLower)
      .gt("blocked_until", now)
      .maybeSingle();

    if (cooldownError) {
      console.error("Error checking cooldown:", cooldownError);
      // Fail open or closed? If we can't check, we should probably fail safe and allow? 
      // Or block? Blocking might be annoying if system is down. 
      // Given the spam risk, maybe we log but proceed if it's a 500?
      // For now, logged error is enough to debug.
    }

    if (cooldownRecord) {
      const blockedUntil = new Date(cooldownRecord.blocked_until);
      const daysRemaining = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      throw new Error(`You cannot email this recruiter for ${daysRemaining} more day(s). Cooldown expires on ${blockedUntil.toLocaleDateString()}.`);
    }

    // ... (rest of code) ...

    // CREATE/UPDATE COOLDOWN after successful send
    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + COOLDOWN_DAYS);

    const { data: existingCooldown, error: fetchError } = await supabase
      .from("email_cooldowns")
      .select("*")
      .eq("user_id", user.id)
      .eq("recruiter_email", recruiterEmailLower)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching existing cooldown for update:", fetchError);
    }

    if (existingCooldown) {
      // Update existing cooldown
      const { error: updateError } = await supabase
        .from("email_cooldowns")
        .update({
          blocked_until: blockedUntil.toISOString(),
          email_count: existingCooldown.email_count + 1,
        })
        .eq("id", existingCooldown.id);

      if (updateError) console.error("Failed to update cooldown:", updateError);
    } else {
      // Create new cooldown
      const { error: insertError } = await supabase
        .from("email_cooldowns")
        .insert({
          user_id: user.id,
          recruiter_email: recruiterEmailLower,
          blocked_until: blockedUntil.toISOString(),
          email_count: 1,
        });

      if (insertError) console.error("Failed to insert cooldown:", insertError);
    }

    // Update daily count
    const newDailyCount = profile.last_sent_date === today
      ? profile.daily_emails_sent + 1
      : 1;

    await supabase
      .from("profiles")
      .update({
        daily_emails_sent: newDailyCount,
        last_sent_date: today,
        total_emails_sent: profile.total_emails_sent + 1,
        successful_emails: profile.successful_emails + 1,
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: gmailResult.id,
        tracking_id: trackingPixelId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
