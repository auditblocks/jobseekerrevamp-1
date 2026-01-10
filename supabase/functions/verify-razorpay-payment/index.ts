import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { encode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function createHmac(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return new TextDecoder().decode(encode(new Uint8Array(signature)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

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

    const payload = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature }: PaymentVerification = payload || {} as PaymentVerification;

    // Validate payload before computing HMAC
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error("Missing required Razorpay fields", {
        payload_keys: Object.keys(payload || {}),
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        signature: razorpay_signature ? razorpay_signature.slice(0, 8) + "..." : undefined,
      });
      return new Response(
        JSON.stringify({ error: "Missing Razorpay verification fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature using Web Crypto API
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = await createHmac(razorpayKeySecret, body);

    if (expectedSignature !== razorpay_signature) {
      // Log enough detail to debug, without leaking secrets
      console.error("Signature verification failed", {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        provided_signature: razorpay_signature?.slice(0, 8) + "...",
        expected_signature: expectedSignature?.slice(0, 8) + "...",
      });
      throw new Error("Invalid payment signature");
    }

    console.log("Payment verified successfully:", razorpay_payment_id);

    // Get subscription history record
    const { data: subscription, error: subError } = await supabase
      .from("subscription_history")
      .select("*, subscription_plans(*)")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    // Calculate expiry date
    const plan = subscription.subscription_plans;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plan?.duration_days || 30));

    // Update subscription history
    const { error: updateError } = await supabase
      .from("subscription_history")
      .update({
        status: "completed",
        razorpay_payment_id,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Failed to update subscription:", updateError);
    }

    // Update user profile with new tier
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: plan?.name?.toUpperCase() || "PRO",
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Failed to update profile:", profileError);
    }

    // Fetch user profile for receipt email
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .single();

    // Send receipt email asynchronously (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/send-purchase-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_id: user.id,
        user_email: profile?.email || user.email || "",
        user_name: profile?.name || "User",
        plan_name: plan?.name || "PRO",
        plan_display_name: plan?.display_name || null,
        amount: subscription.amount, // Already in rupees
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        purchase_date: new Date().toISOString(),
        expiry_date: expiresAt.toISOString(),
        duration_days: plan?.duration_days || 30,
      }),
    }).catch(err => {
      console.error("Failed to send receipt email:", err);
      // Don't fail payment verification if receipt fails
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        subscription_tier: plan?.name?.toUpperCase() || "PRO",
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
