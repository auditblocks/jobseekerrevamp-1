/**
 * @module send-contact-form
 * @description Supabase Edge Function that processes public contact form submissions.
 * Validates input fields, sanitizes HTML to prevent XSS, persists the submission to
 * `contact_submissions`, and forwards a formatted notification email to the support
 * team via Resend. Optionally associates the submission with an authenticated user.
 *
 * @route POST /send-contact-form  (public, optional auth)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_SOURCES = ["home", "contact_page", "settings"] as const;
type ContactSource = (typeof ALLOWED_SOURCES)[number];

interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  source?: string;
}

/** Escape user-supplied strings before embedding in the notification email HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL or service role key not configured");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const body: ContactFormRequest = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const rawSource = typeof body.source === "string" ? body.source.trim() : "contact_page";
    const source: ContactSource = ALLOWED_SOURCES.includes(rawSource as ContactSource)
      ? (rawSource as ContactSource)
      : "contact_page";

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If the caller is authenticated, attach their user ID for traceability.
    // Use the anon key (not service key) so RLS context is respected during getUser.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && supabaseAnonKey) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      userId = user?.id ?? null;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error: insertError } = await supabaseAdmin.from("contact_submissions").insert({
      user_id: userId,
      name,
      email,
      subject,
      message,
      source,
      status: "open",
    });

    if (insertError) {
      console.error("contact_submissions insert failed:", insertError);
      return new Response(
        JSON.stringify({
          error: "Could not save your message. Please try again later.",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const resend = new Resend(resendApiKey);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);
    const safeSource = escapeHtml(source);

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        <p style="font-size: 12px; color: #666;"><strong>Source:</strong> ${safeSource}</p>
        ${userId ? `<p style="font-size: 12px; color: #666;"><strong>User ID:</strong> ${escapeHtml(userId)}</p>` : ""}
        <div style="background-color: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Name:</strong> ${safeName}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${encodeURIComponent(email)}">${safeEmail}</a></p>
          <p style="margin: 10px 0;"><strong>Subject:</strong> ${safeSubject}</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Message:</h3>
          <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
          <p>This email was sent from the contact form on startworking.in</p>
          <p>You can reply directly to this email to respond to ${safeName}</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "JobSeeker Contact Form <hello@startworking.in>",
      to: ["support@startworking.in"],
      reply_to: email,
      subject: `Contact Form [${source}]: ${subject}`,
      html: emailBody,
    });

    console.log("Contact form email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Thank you for contacting us! We'll get back to you soon.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error sending contact form:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send message. Please try again later.",
        details: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
