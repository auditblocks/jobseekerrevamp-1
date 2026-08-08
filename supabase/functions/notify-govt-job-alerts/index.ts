/**
 * @module notify-govt-job-alerts
 * @description Supabase Edge Function, intended to run hourly via pg_cron, that
 * notifies users when a new government job posting matches their saved keywords
 * (organization, exam name, post type — see govt_job_alert_prefs). This is v1:
 * simple keyword/organization matching, not AI-parsed age/education eligibility —
 * govt_jobs has no structured eligibility columns today.
 *
 * Looks back a wider window (LOOKBACK_HOURS) than the run interval so a delayed
 * or skipped cron tick can't cause a posting to be missed; govt_job_alert_log
 * (PRIMARY KEY (user_id, govt_job_id)) guarantees each user is notified at most
 * once per job even if this function re-scans the same posting on a later run —
 * the insert IS the claim, mirroring lifecycle-reengagement-emails.
 *
 * Both channels are used: in-app `user_notifications` (NotificationBell) and,
 * when the user has email_enabled, a Resend email.
 *
 * Requires: RESEND_API_KEY (optional — logs only if absent), SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY
 * Auth: service-role bearer or x-cron-secret (see _shared/admin-auth.ts)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { isAuthorizedAdminRequest } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const LOOKBACK_HOURS = 6;
const SITE_URL = Deno.env.get("SITE_URL") || "https://startworking.in";
const FROM_ADDRESS = Deno.env.get("LIFECYCLE_EMAIL_FROM") || "JobSeeker <hello@startworking.in>";

interface GovtJobRow {
  id: string;
  organization: string;
  post_name: string;
  exam_name: string | null;
  created_at: string;
}

interface AlertPrefRow {
  user_id: string;
  keywords: string[];
  email_enabled: boolean;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** True if any saved keyword appears (case-insensitively) in the job's org/post/exam text. */
function matchesKeywords(job: GovtJobRow, keywords: string[]): string | null {
  const haystack = `${job.organization} ${job.post_name} ${job.exam_name ?? ""}`.toLowerCase();
  for (const kw of keywords) {
    const needle = kw.trim().toLowerCase();
    if (needle && haystack.includes(needle)) return kw;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!(await isAuthorizedAdminRequest(req, supabase))) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    if (!resend) {
      console.warn("RESEND_API_KEY not configured — will log notifications only, skip emails.");
    }

    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

    const { data: recentJobs, error: jobsErr } = await supabase
      .from("govt_jobs")
      .select("id, organization, post_name, exam_name, created_at")
      .eq("status", "active")
      .gte("created_at", since);
    if (jobsErr) throw jobsErr;

    const jobs = (recentJobs ?? []) as GovtJobRow[];
    if (jobs.length === 0) {
      return json({ success: true, message: "No new postings in window", matched: 0, notified: 0 });
    }

    const { data: prefRows, error: prefsErr } = await supabase
      .from("govt_job_alert_prefs")
      .select("user_id, keywords, email_enabled");
    if (prefsErr) throw prefsErr;

    const prefs = ((prefRows ?? []) as AlertPrefRow[]).filter((p) => (p.keywords ?? []).length > 0);
    if (prefs.length === 0) {
      return json({ success: true, message: "No users with alert keywords", matched: 0, notified: 0 });
    }

    let matched = 0;
    let notified = 0;
    let skipped = 0;
    let failed = 0;

    for (const job of jobs) {
      for (const pref of prefs) {
        const hit = matchesKeywords(job, pref.keywords);
        if (!hit) continue;
        matched++;

        // Insert IS the claim: PK (user_id, govt_job_id) makes a duplicate a no-op.
        const { error: claimError } = await supabase
          .from("govt_job_alert_log")
          .insert({ user_id: pref.user_id, govt_job_id: job.id });

        if (claimError) {
          if ((claimError as { code?: string }).code === "23505") {
            skipped++;
          } else {
            console.error(`Failed to claim alert for user ${pref.user_id} / job ${job.id}:`, claimError);
            failed++;
          }
          continue;
        }

        try {
          const title = `New: ${job.post_name}`;
          const message = `${job.organization} just posted "${job.post_name}" — matched your saved alert "${hit}".`;

          await supabase.from("user_notifications").insert({
            user_id: pref.user_id,
            title,
            message,
            type: "info",
            metadata: { govt_job_id: job.id, matched_keyword: hit },
          });

          if (resend && pref.email_enabled) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, name")
              .eq("id", pref.user_id)
              .maybeSingle();
            if (profile?.email) {
              await resend.emails.send({
                from: FROM_ADDRESS,
                to: profile.email,
                subject: title,
                html: `
                  <p>Hi ${escapeHtml(profile.name || "there")},</p>
                  <p><strong>${escapeHtml(job.organization)}</strong> just posted <strong>${escapeHtml(job.post_name)}</strong> — matching your saved alert keyword "${escapeHtml(hit)}".</p>
                  <p><a href="${SITE_URL}/government-jobs" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">View the posting</a></p>
                  <p style="color:#6b7280;font-size:12px;">Manage your job alert keywords in Settings.</p>
                `,
              });
            }
          }

          notified++;
        } catch (sendErr) {
          console.error(`Failed to notify user ${pref.user_id} for job ${job.id}:`, sendErr);
          failed++;
        }
      }
    }

    return json({ success: true, jobs_scanned: jobs.length, matched, notified, skipped, failed });
  } catch (error) {
    console.error("Error in notify-govt-job-alerts:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ success: false, error: msg }, 500);
  }
});
