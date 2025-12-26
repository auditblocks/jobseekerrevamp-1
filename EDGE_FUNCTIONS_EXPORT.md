# Edge Functions Export

Copy each function to your Supabase project's `supabase/functions/` folder.

## Required Secrets (configure in Supabase Dashboard → Settings → Edge Functions → Secrets)

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `LOVABLE_API_KEY`

## config.toml

Create `supabase/config.toml`:

```toml
[functions.create-razorpay-order]
verify_jwt = false

[functions.verify-razorpay-payment]
verify_jwt = false

[functions.send-email-gmail]
verify_jwt = false

[functions.track-email-open]
verify_jwt = false

[functions.gmail-oauth-callback]
verify_jwt = false

[functions.generate-email-ai]
verify_jwt = false

[functions.ai-chat]
verify_jwt = false

[functions.generate-follow-up]
verify_jwt = false

[functions.send-email-resend]
verify_jwt = false

[functions.get-google-client-id]
verify_jwt = false

[functions.email-webhook]
verify_jwt = false
```

---

## 1. create-razorpay-order/index.ts

```typescript
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
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { plan_id, amount }: OrderRequest = await req.json();

    if (!plan_id || !amount) {
      throw new Error("Missing plan_id or amount");
    }

    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100,
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
```

---

## 2. verify-razorpay-payment/index.ts

```typescript
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature }: PaymentVerification = await req.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = await createHmac(razorpayKeySecret, body);

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      throw new Error("Invalid payment signature");
    }

    console.log("Payment verified successfully:", razorpay_payment_id);

    const { data: subscription, error: subError } = await supabase
      .from("subscription_history")
      .select("*, subscription_plans(*)")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    const plan = subscription.subscription_plans;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plan?.duration_days || 30));

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
```

---

## 3. send-email-gmail/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  recruiterName?: string;
  attachResume?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (!profile.google_refresh_token) {
      throw new Error("Gmail not connected. Please connect your Gmail account first.");
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = profile.subscription_tier === "FREE" ? 5 : 
                       profile.subscription_tier === "PRO" ? 50 : 1000;
    
    if (profile.last_sent_date === today && profile.daily_emails_sent >= dailyLimit) {
      throw new Error(`Daily email limit (${dailyLimit}) reached. Upgrade to send more emails.`);
    }

    const { to, subject, body, recruiterName }: EmailRequest = await req.json();

    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: profile.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Failed to refresh token");
      throw new Error("Failed to refresh Gmail access. Please reconnect your Gmail account.");
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    const trackingPixelId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingPixelId}`;
    const emailBodyWithTracking = `${body}
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    const rawEmail = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      emailBodyWithTracking,
    ].join("\r\n");

    const encodedEmail = btoa(rawEmail)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const gmailResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedEmail }),
      }
    );

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.text();
      console.error("Gmail API error:", errorData);
      throw new Error("Failed to send email via Gmail");
    }

    const gmailResult = await gmailResponse.json();
    console.log("Email sent:", gmailResult.id);

    const domain = to.split("@")[1]?.split(".")[0] || "unknown";

    const { error: trackingError } = await supabase
      .from("email_tracking")
      .insert({
        user_id: user.id,
        recipient: to,
        subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        tracking_pixel_id: trackingPixelId,
        email_id: gmailResult.id,
        domain,
      });

    if (trackingError) {
      console.error("Failed to store tracking:", trackingError);
    }

    await supabase
      .from("email_history")
      .insert({
        user_id: user.id,
        recipient: to,
        subject,
        status: "sent",
        domain,
      });

    const newDailyCount = profile.last_sent_date === today 
      ? profile.daily_emails_sent + 1 
      : 1;

    await supabase
      .from("profiles")
      .update({
        daily_emails_sent: newDailyCount,
        last_sent_date: today,
        total_emails_sent: profile.total_emails_sent + 1,
        successful_emails: profile.successful_emails + 1,
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: gmailResult.id,
        tracking_id: trackingPixelId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

## 4. track-email-open/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const trackingId = url.searchParams.get("id");
  const eventType = url.searchParams.get("event") || "open";

  console.log(`Tracking event: ${eventType} for ID: ${trackingId}`);

  if (!trackingId) {
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
    let updateData: Record<string, any> = {};
    
    switch (eventType) {
      case "open":
        updateData = { opened_at: now, status: "opened" };
        break;
      case "click":
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
        break;
      case "reply":
        updateData = { replied_at: now, status: "replied" };
        break;
      case "bounce":
        updateData = { bounced_at: now, status: "bounced" };
        break;
      case "delivered":
        updateData = { status: "delivered" };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      if (eventType === "open") {
        await supabase
          .from("email_tracking")
          .update(updateData)
          .eq("tracking_pixel_id", trackingId)
          .is("opened_at", null);
      } else {
        await supabase
          .from("email_tracking")
          .update(updateData)
          .eq("tracking_pixel_id", trackingId);
      }
    }
  } catch (error) {
    console.error("Tracking error:", error);
  }

  if (eventType === "click") {
    const redirectUrl = url.searchParams.get("url");
    if (redirectUrl) {
      return new Response(null, {
        status: 302,
        headers: { "Location": redirectUrl, ...corsHeaders },
      });
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...corsHeaders,
    },
  });
});
```

---

## 5. gmail-oauth-callback/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OAuthRequest {
  code: string;
  redirect_uri: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

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

    const { code, redirect_uri }: OAuthRequest = await req.json();

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange authorization code");
    }

    const tokens = await tokenResponse.json();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        google_refresh_token: tokens.refresh_token,
        gmail_token_refreshed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      throw new Error("Failed to save Gmail connection");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Gmail connected successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 6. generate-email-ai/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  domain: string;
  recruiterName?: string;
  companyName?: string;
  jobTitle?: string;
  resumeFileName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, professional_title, bio")
      .eq("id", user.id)
      .single();

    const { domain, recruiterName, companyName, jobTitle, resumeFileName }: GenerateRequest = await req.json();

    const systemPrompt = `You are an expert job application email writer. Write professional, personalized cold emails to recruiters. 
The emails should be:
- Professional but warm
- Concise (under 200 words)
- Highlight relevant skills
- Include a clear call-to-action
- Avoid generic phrases and clichés

Return your response as JSON with "subject" and "body" fields.`;

    const userPrompt = `Write an email for a job seeker with the following details:
- Name: ${profile?.name || "Job Seeker"}
- Title: ${profile?.professional_title || "Professional"}
- Bio: ${profile?.bio || "Experienced professional seeking new opportunities"}
- Domain: ${domain}
${recruiterName ? `- Recruiter Name: ${recruiterName}` : ""}
${companyName ? `- Company: ${companyName}` : ""}
${jobTitle ? `- Target Role: ${jobTitle}` : ""}
${resumeFileName ? `- Resume attached: ${resumeFileName}` : ""}

Generate a compelling cold email subject line and body.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Rate limit exceeded.");
      if (response.status === 402) throw new Error("AI credits depleted.");
      throw new Error("Failed to generate email content");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let emailContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        emailContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      emailContent = {
        subject: `Interested in ${domain} opportunities`,
        body: content,
      };
    }

    return new Response(JSON.stringify(emailContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 7. ai-chat/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { messages, context }: ChatRequest = await req.json();

    const systemPrompt = `You are JobSeeker AI, a helpful assistant for job seekers. You help with:
- Writing and improving resumes and cover letters
- Crafting personalized cold emails to recruiters
- Interview preparation and tips
- Job search strategies
- Career advice and guidance

Be professional, encouraging, and actionable in your responses.
${context ? `\nContext: ${context}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to get AI response");
    }

    if (userId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        await supabase
          .from("chatbot_conversations")
          .insert({ user_id: userId, message: lastMessage.content });
      }
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 8. generate-follow-up/index.ts

```typescript
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { thread_id } = await req.json();

    const { data: thread, error: threadError } = await supabase
      .from("conversation_threads")
      .select(`*, conversation_messages(*)`)
      .eq("id", thread_id)
      .eq("user_id", user.id)
      .single();

    if (threadError || !thread) throw new Error("Thread not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, professional_title")
      .eq("id", user.id)
      .single();

    const lastMessage = thread.conversation_messages
      ?.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

    const daysSinceLastContact = lastMessage 
      ? Math.floor((Date.now() - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    const systemPrompt = `You are an expert at writing professional follow-up emails. Generate a polite, professional follow-up email that:
- References the previous email without being pushy
- Adds value or new information if possible
- Has a clear but soft call-to-action
- Is concise (under 150 words)

Return your response as JSON with "subject", "body", "priority" (low/medium/high), and "reason" fields.`;

    const userPrompt = `Generate a follow-up email for:
- Sender: ${profile?.name || "Job Seeker"} (${profile?.professional_title || "Professional"})
- Recipient: ${thread.recruiter_name || "Recruiter"} at ${thread.company_name || "Company"}
- Days since last contact: ${daysSinceLastContact}
- Original subject: ${thread.subject_line || "Job Opportunity"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error("Failed to generate follow-up");

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let followUpContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        followUpContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      followUpContent = {
        subject: `Following up: ${thread.subject_line || "Our conversation"}`,
        body: content,
        priority: daysSinceLastContact > 7 ? "high" : "medium",
        reason: `${daysSinceLastContact} days since last contact`,
      };
    }

    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + (daysSinceLastContact > 7 ? 0 : 3));

    await supabase.from("follow_up_suggestions").insert({
      thread_id,
      suggested_date: suggestedDate.toISOString(),
      suggested_subject: followUpContent.subject,
      suggested_body_preview: followUpContent.body?.substring(0, 200),
      priority: followUpContent.priority || "medium",
      reason: followUpContent.reason || "Automated follow-up suggestion",
      ai_generated: true,
    });

    return new Response(JSON.stringify(followUpContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 9. send-email-resend/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { to, subject, body, from_name } = await req.json();

    const resend = new Resend(resendApiKey);
    const trackingPixelId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingPixelId}`;
    
    const emailBodyWithTracking = `${body}
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    const emailResponse = await resend.emails.send({
      from: `${from_name || "JobSeeker"} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html: emailBodyWithTracking,
    });

    const domain = to.split("@")[1]?.split(".")[0] || "unknown";
    
    await supabase.from("email_tracking").insert({
      user_id: user.id,
      recipient: to,
      subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      tracking_pixel_id: trackingPixelId,
      domain,
    });

    await supabase.from("email_history").insert({
      user_id: user.id,
      recipient: to,
      subject,
      status: "sent",
      domain,
    });

    return new Response(
      JSON.stringify({ success: true, message_id: (emailResponse as any).id, tracking_id: trackingPixelId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 10. get-google-client-id/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");

    if (!googleClientId) {
      return new Response(
        JSON.stringify({ error: "Google OAuth is not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ clientId: googleClientId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 11. email-webhook/index.ts

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const { type, data, created_at } = payload;
    const trackingId = data.tracking_id || data.email_id;

    if (!trackingId) {
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
        break;
      case "email.opened":
        updateData = { opened_at: now, status: "opened" };
        break;
      case "email.clicked":
        const { data: currentData } = await supabase
          .from("email_tracking")
          .select("click_links")
          .eq("tracking_pixel_id", trackingId)
          .single();
        const existingLinks = currentData?.click_links || [];
        updateData = {
          clicked_at: now,
          status: "clicked",
          click_links: [...existingLinks, { url: data.click?.link || "", clicked_at: now }],
        };
        break;
      case "email.bounced":
      case "email.complained":
        updateData = { bounced_at: now, status: "bounced" };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from("email_tracking")
        .update(updateData)
        .eq("tracking_pixel_id", trackingId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## Deployment Instructions

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Create each function folder under `supabase/functions/`
5. Deploy: `supabase functions deploy`

**Note:** The `LOVABLE_API_KEY` is specific to Lovable's AI gateway. For external Supabase, you'll need to replace with OpenAI, Anthropic, or another AI provider's API.
