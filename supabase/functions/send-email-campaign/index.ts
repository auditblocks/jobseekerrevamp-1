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
  console.log("=== send-email-campaign function called ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let requestCampaignId: string | undefined;

  try {
    console.log("Step 1: Checking RESEND_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("RESEND_API_KEY not configured");
    }
    console.log("RESEND_API_KEY found");

    console.log("Step 2: Getting Supabase credentials");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log("Supabase URL:", supabaseUrl);

    console.log("Step 3: Checking authorization header");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header found");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    console.log("Authorization header found");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Step 4: Verifying user token");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      console.error("User:", user);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    console.log("User authenticated:", user.id, user.email);

    console.log("Step 5: Checking admin access");
    // Check if user is admin - check both user_roles and profiles
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Error checking user_roles:", roleError);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error checking profiles:", profileError);
    }

    const isAdmin = !!roleData || profile?.role === "superadmin";
    console.log("Is admin:", isAdmin, "roleData:", roleData, "profile role:", profile?.role);
    
    if (!isAdmin) {
      console.error("User is not an admin");
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

    console.log("Step 7: Validating request");
    if (!campaign_id || !recipient_ids || recipient_ids.length === 0) {
      console.error("Validation failed:", { campaign_id, recipient_ids });
      throw new Error("campaign_id and recipient_ids are required");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(campaign_id)) {
      console.error("Invalid campaign_id format:", campaign_id);
      throw new Error("Invalid campaign_id: must be a valid UUID");
    }

    // Validate all recipient IDs are valid UUIDs
    const invalidRecipientIds = recipient_ids.filter((id: string) => !uuidRegex.test(id));
    if (invalidRecipientIds.length > 0) {
      console.error("Invalid recipient_ids:", invalidRecipientIds);
      throw new Error(`Invalid recipient_ids: ${invalidRecipientIds.length} invalid UUID(s) found. Invalid IDs: ${invalidRecipientIds.join(", ")}`);
    }
    
    console.log("UUID validation passed");

    console.log("Step 8: Fetching campaign details");
    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign fetch error:", campaignError);
      console.error("Campaign data:", campaign);
      throw new Error("Campaign not found");
    }
    console.log("Campaign found:", campaign.subject);

    console.log("Step 9: Fetching attachments");
    // Fetch attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from("email_campaign_attachments")
      .select("*")
      .eq("campaign_id", campaign_id);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }
    console.log("Attachments found:", attachments?.length || 0);

    console.log("Step 10: Fetching recipient user details");
    // Fetch recipient user details
    console.log("Fetching recipients with IDs:", recipient_ids);
    const { data: recipients, error: recipientsError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", recipient_ids);

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      console.error("Recipient IDs that caused error:", recipient_ids);
      throw new Error("Failed to fetch recipients: " + recipientsError.message);
    }

    if (!recipients || recipients.length === 0) {
      console.error("No recipients found for IDs:", recipient_ids);
      throw new Error("No valid recipients found");
    }
    
    console.log("Recipients found:", recipients.length);
    console.log("Recipient details:", recipients.map(r => ({ id: r.id, email: r.email })));
    
    // Validate that all recipient IDs have valid UUIDs
    const invalidRecipients = recipients.filter(r => !uuidRegex.test(r.id));
    if (invalidRecipients.length > 0) {
      console.error("Recipients with invalid UUIDs:", invalidRecipients);
      throw new Error("Some recipients have invalid UUIDs");
    }

    console.log("Step 11: Updating campaign status to sending");
    // Update campaign status to sending
    const { error: updateError } = await supabase
      .from("email_campaigns")
      .update({
        status: "sending",
        started_at: new Date().toISOString(),
        total_recipients: recipients.length,
      })
      .eq("id", campaign_id);

    if (updateError) {
      console.error("Error updating campaign status:", updateError);
    }

    console.log("Step 12: Initializing Resend client");
    const resend = new Resend(resendApiKey);
    let sentCount = 0;
    let failedCount = 0;
    console.log("Starting to send emails to", recipients.length, "recipients");

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
    console.log("Step 13: Starting email sending loop");
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`Sending email ${i + 1}/${recipients.length} to ${recipient.email}`);
      
      try {
        // Generate tracking IDs
        const trackingPixelId = crypto.randomUUID();
        const clickTrackingId = crypto.randomUUID();
        console.log(`Generated tracking IDs for ${recipient.email}`);

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
        console.log(`Calling Resend API for ${recipient.email}`);
        const emailResponse = await resend.emails.send({
          from: from_email || `${from_name || campaign.from_name || "JobSeeker"} <onboarding@resend.dev>`,
          to: [recipient.email],
          subject: campaign.subject,
          html: emailBody,
          attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
        });
        console.log(`Resend response for ${recipient.email}:`, JSON.stringify(emailResponse, null, 2));
        
        // Validate Resend response
        if (!emailResponse || (emailResponse as any).error) {
          console.error("Resend API error:", (emailResponse as any)?.error);
          throw new Error(`Failed to send email via Resend: ${(emailResponse as any)?.error?.message || "Unknown error"}`);
        }
        
        const resendEmailId = (emailResponse as any)?.id || (emailResponse as any)?.data?.id;
        console.log(`Resend email ID for ${recipient.email}:`, resendEmailId);
        
        // Only store Resend email ID if it's a valid UUID
        let validResendEmailId: string | null = null;
        if (resendEmailId && uuidRegex.test(resendEmailId)) {
          validResendEmailId = resendEmailId;
        } else if (resendEmailId) {
          console.warn(`Invalid Resend email ID format (not a UUID): ${resendEmailId}`);
        }

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
    console.error("=== ERROR in send-email-campaign ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Request campaign ID:", requestCampaignId);
    
    // Update campaign status to failed if campaign_id exists
    try {
      if (requestCampaignId) {
        console.log("Updating campaign status to failed");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { error: updateError } = await supabase
          .from("email_campaigns")
          .update({
            status: "failed",
            error_message: error?.message || "Unknown error",
          })
          .eq("id", requestCampaignId);

        if (updateError) {
          console.error("Failed to update campaign status:", updateError);
        } else {
          console.log("Campaign status updated to failed");
        }
      }
    } catch (updateError) {
      console.error("Failed to update campaign status:", updateError);
    }

    const errorResponse = {
      error: error?.message || "Unknown error occurred",
      details: error?.stack,
      campaign_id: requestCampaignId,
    };

    console.error("Returning error response:", errorResponse);

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: error?.message?.includes("Unauthorized") ? 401 : 
                error?.message?.includes("Forbidden") ? 403 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

