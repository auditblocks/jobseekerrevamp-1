/**
 * @file send-email-gmail — Supabase Edge Function
 *
 * Sends an email on behalf of the authenticated user via their connected Gmail
 * account (OAuth2 refresh-token flow). Supports:
 *   - HTML formatting with an invisible tracking pixel for open-tracking.
 *   - Resume attachment (inline base64 or fetched from Supabase Storage).
 *   - Additional file attachments (up to 5, each <=6 MB).
 *   - Spam protection: per-recruiter cooldown enforced via `email_cooldowns`.
 *   - Subscription-tier daily send limits (FREE=5, PRO=50, ENTERPRISE=1000).
 *   - Conversation thread creation/update for the in-app messaging timeline.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import {
  buildGmailRawMessage,
  encodeRawForGmailApi,
  formatPlainTextToHtml,
  wrapHtmlWithTrackingPixel,
} from "./email-format.ts";
import { fetchPrimaryResumeForUser, guessMimeFromResumeFileName } from "./resume-attachment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_COMPOSITION_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

interface IncomingAttachment {
  filename: string;
  content_base64: string;
  mime_type?: string;
}

interface ResumeInlinePayload {
  filename: string;
  content_base64: string;
  mime_type?: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  recruiterName?: string;
  attachResume?: boolean;
  attachments?: IncomingAttachment[];
  resumeInline?: ResumeInlinePayload;
}

/** Insert CRLF every 76 characters per MIME base64 encoding rules (RFC 2045). */
function wrapBase64ForMime(b64: string): string {
  return b64.replace(/\s/g, "").replace(/.{76}(?=.)/g, "$&\r\n");
}

/** Calculate decoded byte length from a base64 string without actually decoding (for size checks). */
function decodedBase64ByteLength(b64: string): number {
  const clean = b64.replace(/\s/g, "");
  if (clean.length === 0) return 0;
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - pad;
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

    // Check daily limit (base plan + referral bonus from DB)
    const today = new Date().toISOString().split("T")[0];
    const { data: capRow, error: capErr } = await supabase.rpc("effective_email_daily_cap", {
      p_user_id: user.id,
    });
    if (capErr) {
      console.error("effective_email_daily_cap:", capErr);
    }
    const capJson = (capRow ?? {}) as { total?: number; base?: number; bonus?: number };
    const dailyLimit =
      typeof capJson.total === "number" && Number.isFinite(capJson.total) && capJson.total > 0
        ? capJson.total
        : profile.subscription_tier === "FREE"
        ? 5
        : profile.subscription_tier === "PRO"
        ? 50
        : 1000;

    if (profile.last_sent_date === today && profile.daily_emails_sent >= dailyLimit) {
      throw new Error(`Daily email limit (${dailyLimit}) reached. Upgrade to send more emails.`);
    }

    const bodyJson = (await req.json()) as EmailRequest & { attachResume?: unknown };
    const { to, subject, body, recruiterName, attachments: rawAttachments, resumeInline } = bodyJson;
    // Accept boolean, string "true", or numeric 1 for flexible client integration
    const attachResume =
      bodyJson.attachResume === true ||
      bodyJson.attachResume === "true" ||
      bodyJson.attachResume === 1;

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

    const htmlInner = formatPlainTextToHtml(typeof body === "string" ? body : "");
    const emailHtmlWithTracking = wrapHtmlWithTrackingPixel(htmlInner, trackingPixelUrl);

    const mimeAttachments: Array<{ filename: string; mime: string; base64Body: string }> = [];

    // Resume resolution order: caller-provided inline base64 → primary resume from Supabase Storage
    if (attachResume) {
      let resumeAtt: { filename: string; mime: string; base64Body: string } | null = null;

      const inline = resumeInline;
      if (
        inline &&
        typeof inline.content_base64 === "string" &&
        inline.content_base64.replace(/\s/g, "").length > 0
      ) {
        const fn =
          typeof inline.filename === "string" && inline.filename.trim()
            ? inline.filename.trim()
            : "resume.pdf";
        const sz = decodedBase64ByteLength(inline.content_base64);
        if (sz > 0 && sz <= MAX_ATTACHMENT_BYTES) {
          const mimeHint = typeof inline.mime_type === "string" ? inline.mime_type.trim() : "";
          resumeAtt = {
            filename: fn.replace(/[\r\n"\\;]/g, "_").slice(0, 200),
            mime: mimeHint || guessMimeFromResumeFileName(fn),
            base64Body: wrapBase64ForMime(inline.content_base64),
          };
        }
      }

      if (!resumeAtt) {
        resumeAtt = await fetchPrimaryResumeForUser(supabase, user.id);
      }

      if (!resumeAtt) {
        throw new Error(
          "No resume found to attach. Upload a resume in Settings, or uncheck “Attach Resume”.",
        );
      }
      mimeAttachments.push(resumeAtt);
    }

    const extra = Array.isArray(rawAttachments) ? rawAttachments : [];
    if (extra.length > MAX_COMPOSITION_ATTACHMENTS) {
      throw new Error(`Too many attachments (max ${MAX_COMPOSITION_ATTACHMENTS}).`);
    }
    for (const a of extra) {
      const fn = typeof a.filename === "string" ? a.filename.trim() : "";
      const b64 = typeof a.content_base64 === "string" ? a.content_base64 : "";
      if (!fn || !b64) continue;
      const size = decodedBase64ByteLength(b64);
      if (size > MAX_ATTACHMENT_BYTES) {
        throw new Error(`Attachment "${fn}" is too large (max ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB).`);
      }
      if (size === 0) continue;
      const mime = typeof a.mime_type === "string" && a.mime_type.trim()
        ? a.mime_type.trim()
        : "application/octet-stream";
      mimeAttachments.push({
        filename: fn.replace(/[\r\n"\\;]/g, "_").slice(0, 200),
        mime,
        base64Body: wrapBase64ForMime(b64),
      });
    }

    const messageRaw = buildGmailRawMessage({
      to,
      subject,
      htmlBody: emailHtmlWithTracking,
      attachments: mimeAttachments,
    });

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

    const encodedMessage = encodeRawForGmailApi(messageRaw);

    // 2. Send via Gmail API
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

    // 3. Store tracking info
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
        email_id: gmailResult.id,
        domain
      });

    // Store in email history
    await supabase.from("email_history").insert({
      user_id: user.id,
      recipient: to,
      subject,
      status: "Delivered", // Use 'Delivered' to match CHECK constraint, or 'Bounced'/'Opened'. 'Sent' is not in list according to migration.
      domain
    });

    // Maintain the in-app conversation timeline — upsert a thread per user+recruiter pair
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
          metadata: { gmail_message_id: gmailResult.id }
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

    // Cooldown prevents users from spamming the same recruiter; default 7 days, configurable via system_settings
    let cooldownDays = 7;
    const { data: cooldownSetting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "email_cooldown_days")
      .single();

    if (cooldownSetting && cooldownSetting.setting_value) {
      cooldownDays = Number(cooldownSetting.setting_value);
    }

    // Upsert cooldown: read-then-write because Supabase JS upsert can't atomically increment
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
