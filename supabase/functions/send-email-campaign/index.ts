import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignRequest {
  campaign_id: string;
  recipient_ids: string[]; // user IDs
  from_name?: string;
  from_email?: string;
}

// Helper function to wrap links with click tracking
function wrapLinksWithTracking(html: string, clickTrackingId: string, supabaseUrl: string): string {
  const trackingUrl = `${supabaseUrl}/functions/v1/track-email-click?id=${clickTrackingId}&url=`;
  
  // Replace all href attributes with tracking URLs
  return html.replace(
    /<a\s+([^>]*\s+)?href=["']([^"']+)["']([^>]*)>/gi,
    (match, before, url, after) => {
      // Skip if already a tracking URL or mailto/tel links
      if (url.startsWith('http') && !url.includes('track-email-click') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
        const encodedUrl = encodeURIComponent(url);
        return `<a ${before || ''}href="${trackingUrl}${encodedUrl}"${after || ''}>`;
      }
      return match;
    }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let requestCampaignId: string | undefined;

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin - check both user_roles and profiles
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = !!roleData || profile?.role === "superadmin";
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestBody: CampaignRequest = await req.json();
    const { campaign_id, recipient_ids, from_name, from_email } = requestBody;
    requestCampaignId = campaign_id; // Store for error handling

    if (!campaign_id || !recipient_ids || recipient_ids.length === 0) {
      throw new Error("campaign_id and recipient_ids are required");
    }

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Fetch attachments
    const { data: attachments } = await supabase
      .from("email_campaign_attachments")
      .select("*")
      .eq("campaign_id", campaign_id);

    // Fetch recipient user details
    const { data: recipients, error: recipientsError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", recipient_ids);

    if (recipientsError || !recipients || recipients.length === 0) {
      throw new Error("No valid recipients found");
    }

    // Update campaign status to sending
    await supabase
      .from("email_campaigns")
      .update({
        status: "sending",
        started_at: new Date().toISOString(),
        total_recipients: recipients.length,
      })
      .eq("id", campaign_id);

    const resend = new Resend(resendApiKey);
    let sentCount = 0;
    let failedCount = 0;

    // Download attachments if any
    const attachmentFiles: any[] = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          // Extract file path from Supabase storage URL
          // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
          const urlParts = attachment.file_url.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('/');
            const bucketName = pathParts[0];
            const filePath = pathParts.slice(1).join('/');

            const { data: fileData, error: fileError } = await supabase.storage
              .from(bucketName)
              .download(filePath);

            if (!fileError && fileData) {
              const arrayBuffer = await fileData.arrayBuffer();
              attachmentFiles.push({
                filename: attachment.file_name,
                content: new Uint8Array(arrayBuffer),
              });
            } else {
              console.error(`Failed to download attachment ${attachment.file_name}:`, fileError);
            }
          }
        } catch (error) {
          console.error(`Failed to download attachment ${attachment.file_name}:`, error);
        }
      }
    }

    // Send emails to each recipient
    for (const recipient of recipients) {
      try {
        // Generate tracking IDs
        const trackingPixelId = crypto.randomUUID();
        const clickTrackingId = crypto.randomUUID();

        // Add tracking pixel to email body
        const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingPixelId}`;
        let emailBody = campaign.html_body;
        
        // Wrap links with click tracking
        emailBody = wrapLinksWithTracking(emailBody, clickTrackingId, supabaseUrl);
        
        // Add tracking pixel
        emailBody += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

        // Replace template variables
        emailBody = emailBody.replace(/\{\{user_name\}\}/g, recipient.name || recipient.email);
        emailBody = emailBody.replace(/\{\{user_email\}\}/g, recipient.email);

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: from_email || `${from_name || campaign.from_name || "JobSeeker"} <onboarding@resend.dev>`,
          to: [recipient.email],
          subject: campaign.subject,
          html: emailBody,
          attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
        });

        // Create recipient record
        await supabase
          .from("email_campaign_recipients")
          .insert({
            campaign_id: campaign_id,
            user_id: recipient.id,
            user_email: recipient.email,
            user_name: recipient.name,
            status: "sent",
            sent_at: new Date().toISOString(),
            tracking_pixel_id: trackingPixelId,
            click_tracking_id: clickTrackingId,
            resend_email_id: (emailResponse as any).id || null,
          });

        // Update campaign counters
        sentCount++;
        await supabase
          .from("email_campaigns")
          .update({
            sent_count: sentCount,
          })
          .eq("id", campaign_id);

      } catch (error: any) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        failedCount++;

        // Create failed recipient record
        await supabase
          .from("email_campaign_recipients")
          .insert({
            campaign_id: campaign_id,
            user_id: recipient.id,
            user_email: recipient.email,
            user_name: recipient.name,
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: error.message || "Failed to send email",
          });

        // Update campaign counters
        await supabase
          .from("email_campaigns")
          .update({
            failed_count: failedCount,
          })
          .eq("id", campaign_id);
      }
    }

    // Update campaign status to completed
    await supabase
      .from("email_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: recipients.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending campaign:", error);
    
    // Update campaign status to failed if campaign_id exists
    try {
      if (requestCampaignId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from("email_campaigns")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", requestCampaignId);
      }
    } catch (updateError) {
      console.error("Failed to update campaign status:", updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

