import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// 1x1 transparent GIF pixel
const PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const trackingId = url.searchParams.get("id");
  const eventType = url.searchParams.get("event") || "open"; // open, click, reply

  console.log(`Tracking event: ${eventType} for ID: ${trackingId}`);

  if (!trackingId) {
    console.log("No tracking ID provided");
    return new Response(PIXEL, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...corsHeaders,
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Build update object based on event type
    let updateData: Record<string, any> = {};
    
    switch (eventType) {
      case "open":
        updateData = {
          opened_at: now,
          status: "opened",
        };
        console.log("Processing open event");
        break;
      
      case "click":
        // Get current link tracking data
        const { data: currentData } = await supabase
          .from("email_tracking")
          .select("click_links")
          .eq("tracking_pixel_id", trackingId)
          .single();

        const linkUrl = url.searchParams.get("url") || "";
        const existingLinks = currentData?.click_links || [];
        
        updateData = {
          clicked_at: now,
          status: "clicked",
          click_links: [...existingLinks, { url: linkUrl, clicked_at: now }],
        };
        console.log("Processing click event for URL:", linkUrl);
        break;
      
      case "reply":
        updateData = {
          replied_at: now,
          status: "replied",
        };
        console.log("Processing reply event");
        break;
      
      case "bounce":
        updateData = {
          bounced_at: now,
          status: "bounced",
        };
        console.log("Processing bounce event");
        break;

      case "delivered":
        updateData = {
          status: "delivered",
        };
        console.log("Processing delivered event");
        break;
        
      default:
        console.log("Unknown event type:", eventType);
    }

    if (Object.keys(updateData).length > 0) {
      // Check if this is a campaign recipient tracking
      const { data: campaignRecipient } = await supabase
        .from("email_campaign_recipients")
        .select("id, campaign_id, opened_at")
        .eq("tracking_pixel_id", trackingId)
        .maybeSingle();

      if (campaignRecipient && eventType === "open" && !campaignRecipient.opened_at) {
        // Update campaign recipient
        await supabase
          .from("email_campaign_recipients")
          .update({
            status: "opened",
            opened_at: now,
          })
          .eq("id", campaignRecipient.id);

        // Update campaign opened count
        const { data: campaign } = await supabase
          .from("email_campaigns")
          .select("opened_count")
          .eq("id", campaignRecipient.campaign_id)
          .single();

        if (campaign) {
          await supabase
            .from("email_campaigns")
            .update({
              opened_count: (campaign.opened_count || 0) + 1,
            })
            .eq("id", campaignRecipient.campaign_id);
        }
      } else if (!campaignRecipient) {
        // For open events, only update if not already opened
        if (eventType === "open") {
          const { error } = await supabase
            .from("email_tracking")
            .update(updateData)
            .eq("tracking_pixel_id", trackingId)
            .is("opened_at", null);

          if (error) {
            console.error("Failed to update open tracking:", error);
          } else {
            console.log("Open tracking updated successfully");
          }
        } else {
          // For other events, always update
          const { error } = await supabase
            .from("email_tracking")
            .update(updateData)
            .eq("tracking_pixel_id", trackingId);

          if (error) {
            console.error(`Failed to update ${eventType} tracking:`, error);
          } else {
            console.log(`${eventType} tracking updated successfully`);
          }
        }
      }

      // Also update conversation_messages if linked
      const { data: trackingData } = await supabase
        .from("email_tracking")
        .select("email_id")
        .eq("tracking_pixel_id", trackingId)
        .single();

      if (trackingData?.email_id) {
        const messageUpdate: Record<string, any> = {};
        
        if (eventType === "open") messageUpdate.opened_at = now;
        if (eventType === "click") messageUpdate.clicked_at = now;
        if (eventType === "reply") messageUpdate.replied_at = now;
        if (eventType !== "open" || Object.keys(messageUpdate).length > 0) {
          messageUpdate.status = updateData.status;
        }

        if (Object.keys(messageUpdate).length > 0) {
          await supabase
            .from("conversation_messages")
            .update(messageUpdate)
            .eq("id", trackingData.email_id);
        }
      }
    }
  } catch (error) {
    console.error("Tracking error:", error);
  }

  // For click events, redirect to the original URL
  if (eventType === "click") {
    const redirectUrl = url.searchParams.get("url");
    if (redirectUrl) {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": redirectUrl,
          ...corsHeaders,
        },
      });
    }
  }

  // Return tracking pixel for open events
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...corsHeaders,
    },
  });
});
