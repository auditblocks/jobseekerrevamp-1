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
    
    const { data: cooldownRecord } = await supabase
      .from("email_cooldowns")
      .select("*")
      .eq("user_id", user.id)
      .eq("recruiter_email", recruiterEmailLower)
      .gt("blocked_until", now)
      .maybeSingle();

    if (cooldownRecord) {
      const blockedUntil = new Date(cooldownRecord.blocked_until);
      const daysRemaining = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      throw new Error(`You cannot email this recruiter for ${daysRemaining} more day(s). Cooldown expires on ${blockedUntil.toLocaleDateString()}.`);
    }

    // Refresh Gmail token
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: profile.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Failed to refresh token");
      throw new Error("Failed to refresh Gmail access. Please reconnect your Gmail account.");
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Generate tracking pixel ID
    const trackingPixelId = crypto.randomUUID();

    // Create email with tracking pixel
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingPixelId}`;
    const emailBodyWithTracking = `${body}
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    // Build email
    const rawEmail = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      emailBodyWithTracking,
    ].join("\r\n");

    const encodedEmail = btoa(rawEmail)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Gmail API
    const gmailResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedEmail }),
      }
    );

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.text();
      console.error("Gmail API error:", errorData);
      throw new Error("Failed to send email via Gmail");
    }

    const gmailResult = await gmailResponse.json();
    console.log("Email sent:", gmailResult.id);

    // Extract domain from email
    const domain = to.split("@")[1]?.split(".")[0] || "unknown";

    // Store tracking record
    const { error: trackingError } = await supabase
      .from("email_tracking")
      .insert({
        user_id: user.id,
        recipient: to,
        subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        tracking_pixel_id: trackingPixelId,
        email_id: gmailResult.id,
        domain,
      });

    if (trackingError) {
      console.error("Failed to store tracking:", trackingError);
    }

    // Store in email history
    await supabase
      .from("email_history")
      .insert({
        user_id: user.id,
        recipient: to,
        subject,
        status: "sent",
        domain,
      });

    // Get recruiter info if available
    const { data: recruiter } = await supabase
      .from("recruiters")
      .select("name, company")
      .eq("email", to)
      .single();

    // Create or get conversation thread
    let threadId: string;
    const { data: existingThread } = await supabase
      .from("conversation_threads")
      .select("id, total_messages, user_messages_count")
      .eq("user_id", user.id)
      .eq("recruiter_email", to)
      .single();

    if (existingThread) {
      threadId = existingThread.id;
      // Update thread
      await supabase
        .from("conversation_threads")
        .update({
          last_activity_at: new Date().toISOString(),
          last_user_message_at: new Date().toISOString(),
          subject_line: subject,
        })
        .eq("id", threadId);
    } else {
      // Create new thread
      const { data: newThread, error: threadError } = await supabase
        .from("conversation_threads")
        .insert({
          user_id: user.id,
          recruiter_email: to,
          recruiter_name: recruiter?.name || recruiterName || null,
          company_name: recruiter?.company || null,
          subject_line: subject,
          status: "active",
          first_contact_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          last_user_message_at: new Date().toISOString(),
          total_messages: 0,
          user_messages_count: 0,
          recruiter_messages_count: 0,
        })
        .select()
        .single();

      if (threadError) {
        console.error("Failed to create conversation thread:", threadError);
      } else {
        threadId = newThread.id;
      }
    }

    // Create conversation message
    if (threadId) {
      const messageNumber = (existingThread?.total_messages || 0) + 1;
      const { error: messageError } = await supabase
        .from("conversation_messages")
        .insert({
          thread_id: threadId,
          sender_type: "user",
          subject: subject,
          body_preview: body.substring(0, 200),
          body_full: body,
          sent_at: new Date().toISOString(),
          message_number: messageNumber,
          status: "sent",
        });

      if (messageError) {
        console.error("Failed to create conversation message:", messageError);
      } else {
        // Update thread message counts
        await supabase
          .from("conversation_threads")
          .update({
            total_messages: messageNumber,
            user_messages_count: (existingThread?.user_messages_count || 0) + 1,
          })
          .eq("id", threadId);
      }
    }

    // CREATE/UPDATE COOLDOWN after successful send
    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + COOLDOWN_DAYS);
    
    const { data: existingCooldown } = await supabase
      .from("email_cooldowns")
      .select("*")
      .eq("user_id", user.id)
      .eq("recruiter_email", recruiterEmailLower)
      .maybeSingle();

    if (existingCooldown) {
      // Update existing cooldown
      await supabase
        .from("email_cooldowns")
        .update({
          blocked_until: blockedUntil.toISOString(),
          email_count: existingCooldown.email_count + 1,
        })
        .eq("id", existingCooldown.id);
    } else {
      // Create new cooldown
      await supabase
        .from("email_cooldowns")
        .insert({
          user_id: user.id,
          recruiter_email: recruiterEmailLower,
          blocked_until: blockedUntil.toISOString(),
          email_count: 1,
        });
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
