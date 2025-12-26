import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    tracking_id?: string;
    from?: string;
    to?: string;
    subject?: string;
    click?: {
      link?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Email webhook received");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    console.log("Webhook payload:", JSON.stringify(payload, null, 2));

    const { type, data, created_at } = payload;
    const trackingId = data.tracking_id || data.email_id;

    if (!trackingId) {
      console.log("No tracking ID in webhook payload");
      return new Response(JSON.stringify({ message: "No tracking ID" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = created_at || new Date().toISOString();
    let updateData: Record<string, any> = {};

    switch (type) {
      case "email.sent":
      case "email.delivered":
        updateData = { status: "delivered" };
        console.log("Email delivered:", trackingId);
        break;

      case "email.delivery_delayed":
        updateData = { status: "delayed" };
        console.log("Email delayed:", trackingId);
        break;

      case "email.opened":
        updateData = { 
          opened_at: now, 
          status: "opened" 
        };
        console.log("Email opened:", trackingId);
        break;

      case "email.clicked":
        const { data: currentData } = await supabase
          .from("email_tracking")
          .select("click_links")
          .eq("tracking_pixel_id", trackingId)
          .single();

        const linkUrl = data.click?.link || "";
        const existingLinks = currentData?.click_links || [];

        updateData = {
          clicked_at: now,
          status: "clicked",
          click_links: [...existingLinks, { url: linkUrl, clicked_at: now }],
        };
        console.log("Email clicked:", trackingId, "URL:", linkUrl);
        break;

      case "email.bounced":
      case "email.complained":
        updateData = { 
          bounced_at: now, 
          status: "bounced" 
        };
        console.log("Email bounced:", trackingId);
        break;

      default:
        console.log("Unknown webhook type:", type);
    }

    if (Object.keys(updateData).length > 0) {
      // Try to update by tracking_pixel_id first
      let { error, count } = await supabase
        .from("email_tracking")
        .update(updateData)
        .eq("tracking_pixel_id", trackingId);

      // If no rows updated, try by email_id
      if (!error && count === 0) {
        const result = await supabase
          .from("email_tracking")
          .update(updateData)
          .eq("email_id", trackingId);
        error = result.error;
      }

      if (error) {
        console.error("Failed to update email tracking:", error);
      } else {
        console.log("Email tracking updated successfully for type:", type);
      }

      // Update conversation_messages if exists
      const { data: trackingRecord } = await supabase
        .from("email_tracking")
        .select("email_id")
        .or(`tracking_pixel_id.eq.${trackingId},email_id.eq.${trackingId}`)
        .single();

      if (trackingRecord?.email_id) {
        const messageUpdate: Record<string, any> = { status: updateData.status };
        if (updateData.opened_at) messageUpdate.opened_at = updateData.opened_at;
        if (updateData.clicked_at) messageUpdate.clicked_at = updateData.clicked_at;
        if (updateData.bounced_at) messageUpdate.status = "bounced";

        await supabase
          .from("conversation_messages")
          .update(messageUpdate)
          .eq("id", trackingRecord.email_id);

        console.log("Conversation message updated");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
