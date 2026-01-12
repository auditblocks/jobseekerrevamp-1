import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
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
  from_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

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

    const { to, subject, body, from_name }: EmailRequest = await req.json();

    // CHECK COOLDOWN - Prevent spamming same recruiter
    const recruiterEmailLower = to.toLowerCase();

    const { data: canEmail, error: checkError } = await supabase
      .rpc('can_email_recruiter', {
        p_user_id: user.id,
        p_recruiter_email: recruiterEmailLower
      });

    if (checkError) {
      console.error("Error checking cooldown:", checkError);
    }

    if (canEmail === false) {
      // Fetch cooldown info for detailed error
      const { data: info } = await supabase
        .rpc('get_cooldown_info', {
          p_user_id: user.id,
          p_recruiter_email: recruiterEmailLower
        });

      if (info && info.length > 0 && info[0].is_blocked) {
        const blockedUntil = new Date(info[0].blocked_until);
        throw new Error(`You cannot email this recruiter for ${info[0].days_remaining} more day(s). Cooldown expires on ${blockedUntil.toLocaleDateString()}.`);
      } else {
        throw new Error("You cannot email this recruiter due to spam protection cooldown.");
      }
    }

    const resend = new Resend(resendApiKey);

    // ... (rest of code) ...

    // Fetch configured cooldown days
    let cooldownDays = 7; // Default
    const { data: cooldownSetting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "email_cooldown_days")
      .single();

    if (cooldownSetting && cooldownSetting.setting_value) {
      cooldownDays = Number(cooldownSetting.setting_value);
    }

    // CREATE/UPDATE COOLDOWN after successful send
    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + cooldownDays);

    const { data: existingCooldown } = await supabase
      .from("email_cooldowns")
      .select("email_count, id")
      .eq("user_id", user.id)
      .eq("recruiter_email", recruiterEmailLower)
      .maybeSingle();

    const newCount = (existingCooldown?.email_count || 0) + 1;

    const { error: upsertError } = await supabase
      .from("email_cooldowns")
      .upsert({
        user_id: user.id,
        recruiter_email: recruiterEmailLower,
        blocked_until: blockedUntil.toISOString(),
        email_count: newCount,
        created_at: existingCooldown?.created_at
      }, { onConflict: 'user_id, recruiter_email' });

    if (upsertError) console.error("Failed to update cooldown:", upsertError);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: (emailResponse as any).id,
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
