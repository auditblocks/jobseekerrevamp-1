import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const resend = new Resend(resendApiKey);

    // Generate tracking pixel ID
    const trackingPixelId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingPixelId}`;
    
    const emailBodyWithTracking = `${body}
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    const emailResponse = await resend.emails.send({
      from: `${from_name || "JobSeeker"} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html: emailBodyWithTracking,
    });

    console.log("Email sent via Resend:", emailResponse);

    // Store tracking record
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
        domain,
      });

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
          recruiter_name: recruiter?.name || from_name || null,
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
