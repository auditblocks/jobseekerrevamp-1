/**
 * @module lifecycle-reengagement-emails
 * @description Supabase Edge Function (intended to be invoked daily via pg_cron, see
 * migration 20260806140100_schedule_lifecycle_reengagement_emails.sql) that closes the
 * biggest retention gap on the platform: users who sign up, hit a setup step, and never
 * come back — with nothing automated ever reaching them again.
 *
 * Sends two behavior-triggered nudges, each a one-time email per user (deduped via
 * `lifecycle_email_log`):
 *
 *   1. `signup_no_gmail`   — signed up 24-72h ago, never connected Gmail.
 *   2. `gmail_no_send`     — connected Gmail 24-72h ago, still hasn't sent an email.
 *
 * The 24-72h window (rather than an exact 24h mark) means a user is still caught even
 * if a cron run is skipped or delayed, while the dedup log guarantees each user only
 * ever receives a given nudge once.
 *
 * Both channels are used: an email via Resend (reaches the user outside the app) and an
 * in-app `user_notifications` row (visible via the existing NotificationBell), matching
 * the pattern already used by `check-subscription-expiry`.
 *
 * @requires RESEND_API_KEY
 * @requires SUPABASE_URL
 * @requires SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_START_HOURS = 72;
const WINDOW_END_HOURS = 24;
const SITE_URL = Deno.env.get("SITE_URL") || "https://startworking.in";
const FROM_ADDRESS = Deno.env.get("LIFECYCLE_EMAIL_FROM") || "JobSeeker <hello@startworking.in>";

interface ProfileRow {
  id: string;
  email: string;
  name: string | null;
  status: string | null;
  created_at: string | null;
  google_refresh_token: string | null;
  gmail_token_refreshed_at: string | null;
  total_emails_sent: number | null;
}

interface NudgeDefinition {
  emailType: "signup_no_gmail" | "gmail_no_send";
  subject: string;
  buildHtml: (name: string) => string;
  notificationTitle: string;
  notificationMessage: string;
}

const NUDGES: Record<NudgeDefinition["emailType"], NudgeDefinition> = {
  signup_no_gmail: {
    emailType: "signup_no_gmail",
    subject: "Finish setting up JobSeeker (2 minutes)",
    notificationTitle: "Finish setting up your account",
    notificationMessage: "Connect Gmail to start reaching recruiters — it only takes a minute.",
    buildHtml: (name) => `
      <p>Hi ${escapeHtml(name)},</p>
      <p>You created a JobSeeker account, but haven't connected Gmail yet — that's the one step standing between you and your first recruiter email.</p>
      <p><a href="${SITE_URL}/compose" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Connect Gmail &amp; get started</a></p>
      <p>It takes about a minute, and your emails send from your own inbox so replies come straight to you.</p>
    `,
  },
  gmail_no_send: {
    emailType: "gmail_no_send",
    subject: "You're one step from your first outreach email",
    notificationTitle: "Send your first email",
    notificationMessage: "Your Gmail is connected — browse recruiters and send your first email.",
    buildHtml: (name) => `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your Gmail is connected, but you haven't sent an email yet. Recruiters won't find you — outreach is what gets replies.</p>
      <p><a href="${SITE_URL}/recruiters" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Browse recruiters &amp; send one now</a></p>
    `,
  },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** Excludes banned/suspended accounts — status may legitimately be null for normal users. */
function isEligibleStatus(status: string | null): boolean {
  return status !== "banned" && status !== "suspended";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    if (!resend) {
      console.warn("RESEND_API_KEY not configured — will log notifications only, skip emails.");
    }

    const windowStart = hoursAgo(WINDOW_START_HOURS); // e.g. 72h ago
    const windowEnd = hoursAgo(WINDOW_END_HOURS); // e.g. 24h ago

    const results: Record<string, { matched: number; sent: number; skipped: number; failed: number }> = {
      signup_no_gmail: { matched: 0, sent: 0, skipped: 0, failed: 0 },
      gmail_no_send: { matched: 0, sent: 0, skipped: 0, failed: 0 },
    };

    // --- Nudge 1: signed up 24-72h ago, never connected Gmail ---
    const { data: noGmailUsers, error: noGmailErr } = await supabase
      .from("profiles")
      .select("id, email, name, status, created_at, google_refresh_token, gmail_token_refreshed_at, total_emails_sent")
      .is("google_refresh_token", null)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd);

    if (noGmailErr) {
      console.error("Error fetching signup_no_gmail candidates:", noGmailErr);
    } else {
      const eligible = (noGmailUsers || []).filter((p: ProfileRow) => isEligibleStatus(p.status));
      results.signup_no_gmail.matched = eligible.length;
      await processNudge(supabase, resend, eligible, NUDGES.signup_no_gmail, results.signup_no_gmail);
    }

    // --- Nudge 2: connected Gmail 24-72h ago, still zero emails sent ---
    const { data: noSendUsers, error: noSendErr } = await supabase
      .from("profiles")
      .select("id, email, name, status, created_at, google_refresh_token, gmail_token_refreshed_at, total_emails_sent")
      .not("google_refresh_token", "is", null)
      .eq("total_emails_sent", 0)
      .gte("gmail_token_refreshed_at", windowStart)
      .lte("gmail_token_refreshed_at", windowEnd);

    if (noSendErr) {
      console.error("Error fetching gmail_no_send candidates:", noSendErr);
    } else {
      const eligible = (noSendUsers || []).filter((p: ProfileRow) => isEligibleStatus(p.status));
      results.gmail_no_send.matched = eligible.length;
      await processNudge(supabase, resend, eligible, NUDGES.gmail_no_send, results.gmail_no_send);
    }

    return new Response(JSON.stringify({ message: "Lifecycle nudge run complete", results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in lifecycle-reengagement-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/**
 * Sends a nudge to each candidate user, skipping anyone already logged for this
 * email_type (dedup) and recording a log row immediately after a successful send
 * so a mid-run failure can't cause a duplicate on the next cron tick.
 */
async function processNudge(
  supabase: ReturnType<typeof createClient>,
  resend: Resend | null,
  candidates: ProfileRow[],
  nudge: NudgeDefinition,
  stats: { matched: number; sent: number; skipped: number; failed: number },
) {
  for (const profile of candidates) {
    // Claim this (user, email_type) pair first — the unique constraint means a
    // concurrent/duplicate run naturally no-ops here instead of double-sending.
    const { error: claimError } = await supabase
      .from("lifecycle_email_log")
      .insert({ user_id: profile.id, email_type: nudge.emailType });

    if (claimError) {
      // Unique violation (already sent) is expected and fine to skip silently.
      if ((claimError as any).code === "23505") {
        stats.skipped++;
      } else {
        console.error(`Failed to claim lifecycle email for ${profile.id}:`, claimError);
        stats.failed++;
      }
      continue;
    }

    try {
      const name = profile.name || "there";

      if (resend && profile.email) {
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: profile.email,
          subject: nudge.subject,
          html: nudge.buildHtml(name),
        });
      }

      await supabase.from("user_notifications").insert({
        user_id: profile.id,
        title: nudge.notificationTitle,
        message: nudge.notificationMessage,
        type: "info",
        metadata: { lifecycle_email_type: nudge.emailType },
      });

      stats.sent++;
    } catch (err) {
      console.error(`Failed to send ${nudge.emailType} to ${profile.id}:`, err);
      stats.failed++;
      // Release the claim so tomorrow's run retries this user instead of losing them silently.
      await supabase
        .from("lifecycle_email_log")
        .delete()
        .eq("user_id", profile.id)
        .eq("email_type", nudge.emailType);
    }
  }
}
