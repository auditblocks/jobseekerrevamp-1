import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ATSOrderRequest {
  analysis_id: string;
  amount: number; // In rupees
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Razorpay credentials not configured");
      return new Response(
        JSON.stringify({
          error: "Payment gateway not configured. Please contact support.",
          details: "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in Supabase secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { analysis_id }: { analysis_id: string } = await req.json();

    if (!analysis_id) {
      throw new Error("Missing analysis_id");
    }

    // SECURITY FIX: Fetch price from settings instead of trusting client
    const { data: settingsData, error: settingsError } = await supabase
      .from("ats_scan_settings")
      .select("setting_value")
      .eq("setting_key", "scan_price")
      .single();

    let amount = 99; // Default fallback

    if (!settingsError && settingsData?.setting_value) {
      try {
        // setting_value is stored as JSON
        const settings = typeof settingsData.setting_value === 'string'
          ? JSON.parse(settingsData.setting_value)
          : settingsData.setting_value;

        if (settings.amount) {
          amount = Number(settings.amount);
        }
      } catch (e) {
        console.error("Error parsing scan settings:", e);
      }
    }

    // Verify analysis belongs to user
    const { data: analysis, error: analysisError } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("id", analysis_id)
      .eq("user_id", user.id)
      .single();

    if (analysisError || !analysis) {
      throw new Error("Analysis not found");
    }

    // Check if already paid
    if (analysis.payment_status === "completed") {
      return new Response(
        JSON.stringify({ error: "Analysis already paid for" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Razorpay order
    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `ats_scan_${Date.now()}`,
        notes: {
          analysis_id,
          user_id: user.id,
          type: "ats_scan",
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error("Razorpay error:", errorData);
      throw new Error("Failed to create Razorpay order");
    }

    const order = await orderResponse.json();
    console.log("Razorpay ATS scan order created:", order.id);

    // Update analysis with order ID
    const { error: updateError } = await supabase
      .from("resume_analyses")
      .update({
        razorpay_order_id: order.id,
        amount_paid: amount,
        payment_status: "pending",
      })
      .eq("id", analysis_id);

    if (updateError) {
      console.error("Failed to update analysis:", updateError);
      throw new Error("Failed to update analysis record");
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        key_id: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating ATS scan order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

