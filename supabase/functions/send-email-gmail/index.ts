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

    // Generate tracking pixel ID
    const trackingPixelId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingPixelId}`;

    const emailBodyWithTracking = `${body}
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    // 1. Refresh Access Token
    const refreshTokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: profile.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await refreshTokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error(`Failed to refresh Google token: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // 2. Construct Email (Base64url encoded)
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    // Simple MIME structure
    const messageParts = [
      `From: me`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      emailBodyWithTracking
    ];

    // Join with CRLF
    const messageRaw = messageParts.join("\r\n");
    // Base64url encoding for Gmail API
    const encodedMessage = btoa(unescape(encodeURIComponent(messageRaw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 3. Send via Gmail API
    const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!gmailResponse.ok) {
      const err = await gmailResponse.text();
      throw new Error(`Gmail API failed: ${err}`);
    }

    const gmailResult = await gmailResponse.json();
    console.log("Email sent via Gmail:", gmailResult);

    // 4. Store tracking info
    const domain = to.split("@")[1]?.split(".")[0] || "unknown";

    await supabase
      .from("email_tracking")
      .insert({
        user_id: user.id,
        recipient: to,
        subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        tracking_pixel_id: trackingPixelId,
        message_id: gmailResult.id,
        domain
      });

    // Store in email history
    await supabase.from("email_history").insert({
      user_id: user.id,
      recipient: to,
      subject,
      status: "sent",
      domain
    });

    // Create/Update Conversation Thread logic (same as Resend)
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
          gmail_message_id: gmailResult.id
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

    // Get current count to increment (optional, or just handle in DB)
    // For simplicity with upsert, we might lose strict increment if we don't read first.
    // But we can read first or just assume +1. 
    // To do it properly with upsert, we need to know the previous value or let DB handle it.
    // Supabase JS upsert doesn't support "increment existing" easily without raw SQL.
    // So we'll keep the read but simplify the write.

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
        created_at: existingCooldown?.created_at // Keep original created_at if exists
      }, { onConflict: 'user_id, recruiter_email' });

    if (upsertError) console.error("Failed to update cooldown:", upsertError);

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
