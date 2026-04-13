import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

function resolveSubscriptionTier(rawPlanId?: string | null, rawPlanName?: string | null): "FREE" | "PRO" | "PRO_MAX" {
  const candidates = [rawPlanId, rawPlanName].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  for (const candidate of candidates) {
    const normalized = candidate.toUpperCase().replace(/[\s-]/g, "_");
    if (normalized.includes("PRO_MAX") || normalized.includes("PROMAX")) return "PRO_MAX";
    if (normalized.includes("PRO")) return "PRO";
    if (normalized.includes("FREE")) return "FREE";
  }
  return "PRO";
}

function normalizeVerifyPayload(raw: Record<string, unknown>): PaymentVerification {
  const order =
    (typeof raw.razorpay_order_id === "string" && raw.razorpay_order_id) ||
    (typeof raw.order_id === "string" && raw.order_id) ||
    "";
  const payment =
    (typeof raw.razorpay_payment_id === "string" && raw.razorpay_payment_id) ||
    (typeof raw.payment_id === "string" && raw.payment_id) ||
    "";
  const sig =
    (typeof raw.razorpay_signature === "string" && raw.razorpay_signature) ||
    (typeof raw.signature === "string" && raw.signature) ||
    "";
  return {
    razorpay_order_id: order.trim(),
    razorpay_payment_id: payment.trim(),
    razorpay_signature: sig.trim(),
  };
}

/** Razorpay expects HMAC-SHA256 as a lowercase hex string (Deno std `hex.encode` returns Uint8Array, not string). */
function hmacDigestToHex(digest: ArrayBuffer): string {
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  return hmacDigestToHex(signature);
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
    
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const payload = (await req.json()) as Record<string, unknown> | null;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = normalizeVerifyPayload(
      payload && typeof payload === "object" ? payload : {},
    );

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

    if (expectedSignature.toLowerCase() !== razorpay_signature.toLowerCase()) {
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

    const { data: idemRows } = await supabase
      .from("subscription_history")
      .select("id, plan_id, amount, expires_at, subscription_plans(*)")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .eq("razorpay_payment_id", razorpay_payment_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);

    const idempotentRow = idemRows?.[0];

    if (idempotentRow) {
      const isFlash = idempotentRow.plan_id === "flash_sale";
      const plan = idempotentRow.subscription_plans as { name?: string; duration_days?: number } | null;
      const subscriptionTier = isFlash
        ? "PRO_MAX"
        : resolveSubscriptionTier(idempotentRow.plan_id, plan?.name);
      const expiresAt =
        idempotentRow.expires_at || new Date().toISOString();
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already verified",
          subscription_tier: subscriptionTier,
          expires_at: expiresAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: subRows, error: subError } = await supabase
      .from("subscription_history")
      .select("*, subscription_plans(*)")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const subscription = subRows?.[0];

    if (subError || !subscription) {
      console.error("verify-razorpay-payment: subscription_history lookup failed", subError, {
        order_id: razorpay_order_id,
        user_id: user.id,
        row_count: Array.isArray(subRows) ? subRows.length : 0,
      });
      throw new Error(
        "Payment record not found for this order. If you were charged, contact support with your payment ID.",
      );
    }

    // Determine subscription tier and duration
    const isFlashSale = subscription.plan_id === 'flash_sale';
    const plan = subscription.subscription_plans;

    // Fetch billing_cycle from Razorpay order notes (set during order creation)
    let billingCycle = 'monthly';
    try {
      const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { "Authorization": `Basic ${credentials}` },
      });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        billingCycle = orderData?.notes?.billing_cycle || 'monthly';
      }
    } catch (e) {
      console.warn("Could not fetch Razorpay order notes, falling back to amount matching:", e);
    }

    let daysToAdd: number;
    let subscriptionTier: string;

    if (isFlashSale) {
      const { data: saleConfig } = await supabase
        .from("flash_sale_config")
        .select("duration_days")
        .limit(1)
        .single();
      daysToAdd = saleConfig?.duration_days ?? 730;
      subscriptionTier = 'PRO_MAX';
    } else {
      daysToAdd = plan?.duration_days || 30;
      if (
        billingCycle === 'yearly' ||
        subscription.amount === plan?.yearly_price ||
        subscription.amount === Math.round(plan.price * 12 * 0.8)
      ) {
        daysToAdd = 365;
      }
      subscriptionTier = resolveSubscriptionTier(subscription.plan_id, plan?.name);
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);

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
        subscription_tier: subscriptionTier,
        subscription_expires_at: expiresAt.toISOString(),
        is_elite_member: isFlashSale,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Failed to update profile:", profileError);
      throw new Error(profileError.message || "Could not update subscription profile");
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
        duration_days: daysToAdd,
      }),
    }).catch(err => {
      console.error("Failed to send receipt email:", err);
      // Don't fail payment verification if receipt fails
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        subscription_tier: subscriptionTier,
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
