import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRequest {
  plan_id: string;
  amount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

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

    const { plan_id, amount }: OrderRequest = await req.json();

    if (!plan_id || !amount) {
      throw new Error("Missing plan_id or amount");
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
          plan_id,
          user_id: user.id,
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
    const { error: insertError } = await supabase
      .from("subscription_history")
      .insert({
        user_id: user.id,
        plan_id,
        amount,
        status: "pending",
        razorpay_order_id: order.id,
      });

    if (insertError) {
      console.error("Failed to store subscription:", insertError);
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
