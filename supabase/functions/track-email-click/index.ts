import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tracking ID and URL from query params
    const url = new URL(req.url);
    const trackingId = url.searchParams.get("id");
    const originalUrl = url.searchParams.get("url");

    if (!trackingId || !originalUrl) {
      // Redirect to a default page if params are missing
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: originalUrl || "https://startworking.in",
        },
      });
    }

    // Find recipient record by click_tracking_id
    const { data: recipient, error: recipientError } = await supabase
      .from("email_campaign_recipients")
      .select("id, campaign_id, clicked_at")
      .eq("click_tracking_id", trackingId)
      .maybeSingle();

    if (recipient && !recipient.clicked_at) {
      // Update recipient clicked status
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: "clicked",
          clicked_at: new Date().toISOString(),
        })
        .eq("id", recipient.id);

      // Update campaign clicked count
      const { data: campaign } = await supabase
        .from("email_campaigns")
        .select("clicked_count")
        .eq("id", recipient.campaign_id)
        .single();

      if (campaign) {
        await supabase
          .from("email_campaigns")
          .update({
            clicked_count: (campaign.clicked_count || 0) + 1,
          })
          .eq("id", recipient.campaign_id);
      }
    }

    // Redirect to original URL
    const decodedUrl = decodeURIComponent(originalUrl);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: decodedUrl,
      },
    });
  } catch (error: any) {
    console.error("Error tracking email click:", error);
    
    // Still try to redirect even if tracking fails
    const url = new URL(req.url);
    const originalUrl = url.searchParams.get("url");
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: originalUrl ? decodeURIComponent(originalUrl) : "https://startworking.in",
      },
    });
  }
});

