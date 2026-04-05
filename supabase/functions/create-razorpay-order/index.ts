import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRequest {
  plan_id: string;
  billing_cycle?: string; // 'monthly' | 'yearly'
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

    const payload = await req.json();
    const plan_id = payload.plan_id;
    const billing_cycle = payload.billing_cycle || 'monthly';

    if (!plan_id) {
      throw new Error("Missing plan_id");
    }

    let amount: number;
    let planNameForHistory: string;

    // --- FLASH SALE: Special case ---
    if (plan_id === 'flash_sale') {
      const { data: saleConfig, error: saleError } = await supabase
        .from("flash_sale_config")
        .select("price, is_active")
        .single();

      if (saleError || !saleConfig) {
        throw new Error("Flash sale configuration not found");
      }
      if (!saleConfig.is_active) {
        throw new Error("Flash sale is no longer active");
      }

      amount = saleConfig.price ?? 1999;
      planNameForHistory = 'flash_sale';
    } else {
      // --- REGULAR PLAN: Fetch from subscription_plans ---
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", plan_id)
        .single();

      if (planError || !plan) {
        throw new Error("Invalid plan selected");
      }

      // SECURITY FIX: price is determined server-side from DB
      amount = plan.price; // default monthly
      if (billing_cycle === 'yearly') {
        amount = plan.yearly_price ?? Math.round(plan.price * 12 * 0.8);
      }
      planNameForHistory = plan_id;
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
        receipt: `order_${Date.now()}`,
        notes: {
          plan_id: planNameForHistory,
          user_id: user.id,
          billing_cycle: plan_id === 'flash_sale' ? 'five_years_flash_sale' : billing_cycle,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error("Razorpay error:", errorData);
      throw new Error("Failed to create Razorpay order");
    }

    const order = await orderResponse.json();
    console.log("Razorpay order created:", order.id);

    // Store pending subscription
    // Also inject billing_cycle if the column existed, but since we don't have a column we rely on notes / metadata
    const { error: insertError } = await supabase
      .from("subscription_history")
      .insert({
        user_id: user.id,
        plan_id: planNameForHistory,
        amount,
        status: "pending",
        razorpay_order_id: order.id,
      });

    if (insertError) {
      console.error("Failed to store subscription:", insertError);
      throw new Error(
        "Could not start checkout (subscription record failed). If this persists, contact support.",
      );
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
    console.error("Error creating order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
