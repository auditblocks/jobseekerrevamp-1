/**
 * @module verify-ats-payment
 * @description Supabase Edge Function that verifies a Razorpay payment for ATS resume
 * scans. Validates the HMAC-SHA256 signature sent by Razorpay against the server-side
 * secret to confirm payment authenticity, then marks the analysis as paid and
 * asynchronously triggers a purchase receipt email.
 *
 * @route POST /verify-ats-payment  (authenticated, expects Razorpay callback payload)
 */
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

/** Generate HMAC-SHA256 hex digest using Web Crypto API (Deno-compatible). */
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature }: PaymentVerification = await req.json();

    // Razorpay signature = HMAC-SHA256(order_id|payment_id, key_secret)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = await createHmac(razorpayKeySecret, body);

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      throw new Error("Invalid payment signature");
    }

    console.log("ATS payment verified successfully:", razorpay_payment_id);

    // Get analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (analysisError || !analysis) {
      throw new Error("Analysis not found");
    }

    // Update analysis payment status
    const { error: updateError } = await supabase
      .from("resume_analyses")
      .update({
        payment_status: "completed",
        razorpay_payment_id,
      })
      .eq("id", analysis.id);

    if (updateError) {
      console.error("Failed to update analysis:", updateError);
      throw new Error("Failed to update analysis payment status");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .single();

    // Fire-and-forget receipt email — don't block the payment confirmation response
    const purchaseIso = new Date().toISOString();
    const amountPaid = Number(analysis.amount_paid) || 0;

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
        plan_name: "ATS scan",
        plan_display_name: "ATS resume scan",
        amount: amountPaid,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        purchase_date: purchaseIso,
        expiry_date: purchaseIso,
        duration_days: 0,
        receipt_kind: "ats",
      }),
    }).catch((err) => {
      console.error("Failed to send ATS receipt email:", err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        analysis_id: analysis.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error verifying ATS payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

