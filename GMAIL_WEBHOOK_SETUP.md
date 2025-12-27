# Gmail Webhook Setup Guide

This guide will help you set up Gmail push notifications to automatically receive recruiter replies in your Conversations page.

## Prerequisites

- Google Cloud Platform (GCP) account
- Gmail API enabled in your GCP project
- Supabase project with edge functions deployed

---

## Option 1: Gmail Push Notifications (Recommended)

### Step 1: Set Up Google Cloud Pub/Sub

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Enable Required APIs**
   - Go to **APIs & Services** → **Library**
   - Search and enable:
     - **Gmail API**
     - **Cloud Pub/Sub API**

3. **Create a Pub/Sub Topic**
   - Go to **Pub/Sub** → **Topics**
   - Click **CREATE TOPIC**
   - Name: `gmail-notifications` (or any name you prefer)
   - Click **CREATE**
   - Note the topic name (e.g., `projects/your-project-id/topics/gmail-notifications`)

4. **Create a Pub/Sub Subscription**
   - In the topic you just created, click **CREATE SUBSCRIPTION**
   - Name: `gmail-webhook-subscription`
   - Delivery type: **Push**
   - **Endpoint URL**: `https://ypmyzbtgossmizklszek.supabase.co/functions/v1/gmail-webhook`
   - Click **CREATE**

5. **Set Up Authentication**
   - Go to **IAM & Admin** → **Service Accounts**
   - Click **CREATE SERVICE ACCOUNT**
   - Name: `gmail-webhook-service`
   - Click **CREATE AND CONTINUE**
   - Grant role: **Pub/Sub Subscriber**
   - Click **DONE**

6. **Create Service Account Key**
   - Click on the service account you just created
   - Go to **KEYS** tab
   - Click **ADD KEY** → **Create new key**
   - Choose **JSON**
   - Download the key file (you'll need this for Supabase secrets)

### Step 2: Configure Supabase Secrets

1. **Get your Supabase project URL and service role key**
   - Go to Supabase Dashboard → **Settings** → **API**
   - Copy your **Project URL** and **service_role key**

2. **Set the Pub/Sub credentials in Supabase**
   ```bash
   # Set the Google Cloud service account JSON as a secret
   supabase secrets set GOOGLE_CLOUD_SERVICE_ACCOUNT='<paste entire JSON content here>'
   ```

   Or set individual values:
   ```bash
   supabase secrets set GOOGLE_CLOUD_PROJECT_ID='your-project-id'
   supabase secrets set GOOGLE_CLOUD_TOPIC_NAME='gmail-notifications'
   ```

### Step 3: Update Gmail Webhook Function (if needed)

The webhook function may need to verify Pub/Sub messages. Update `supabase/functions/gmail-webhook/index.ts` to handle Pub/Sub authentication if required.

### Step 4: Enable Gmail Watch for Users

You need to call Gmail's `watch` API for each user when they connect their Gmail account. This should be done in your Gmail OAuth callback function.

**Update `supabase/functions/gmail-oauth-callback/index.ts`** to add watch setup:

```typescript
// After successfully getting the access token, add:
const watchResponse = await fetch(
  `https://gmail.googleapis.com/gmail/v1/users/me/watch`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName: `projects/YOUR_PROJECT_ID/topics/gmail-notifications`,
      labelIds: ["INBOX"], // Watch for messages in inbox
    }),
  }
);

if (watchResponse.ok) {
  const watchData = await watchResponse.json();
  console.log("Gmail watch enabled:", watchData);
  // Store expiration time (usually 7 days)
  // You'll need to renew the watch before it expires
}
```

**Important Notes:**
- Gmail watch expires after 7 days
- You need to renew the watch before expiration
- The watch only works for the user's primary inbox

### Step 5: Test the Setup

1. **Send a test email** from your app to a recruiter
2. **Have the recruiter reply** (or send yourself a test reply)
3. **Check Supabase logs**:
   - Go to Supabase Dashboard → **Edge Functions** → **gmail-webhook** → **Logs**
   - You should see incoming webhook requests

4. **Check the Conversations page** - the reply should appear automatically

---

## Option 2: Periodic Polling (Simpler Alternative)

If Pub/Sub setup is too complex, you can create a scheduled function that periodically checks for new messages.

### Step 1: Create a Polling Function

Create `supabase/functions/check-gmail-replies/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    // Get all users with Gmail connected
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, google_refresh_token")
      .not("google_refresh_token", "is", null);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users with Gmail connected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process each user
    for (const profile of profiles) {
      try {
        // Refresh token
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

        if (!tokenResponse.ok) continue;

        const tokens = await tokenResponse.json();
        const accessToken = tokens.access_token;

        // Get unread messages from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const query = `is:inbox is:unread after:${Math.floor(yesterday.getTime() / 1000)}`;

        const messagesResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!messagesResponse.ok) continue;

        const messagesList = await messagesResponse.json();
        
        if (!messagesList.messages || messagesList.messages.length === 0) continue;

        // Process each message (similar to gmail-webhook logic)
        // ... (copy the message processing logic from gmail-webhook/index.ts)
      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
        continue;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Polling error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Step 2: Set Up Cron Job

You can trigger this function periodically using:

**Option A: Supabase Cron (if available)**
- Set up a cron job in Supabase Dashboard to call this function every 5-15 minutes

**Option B: External Cron Service**
- Use a service like cron-job.org or EasyCron
- Set it to call: `https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies`
- Frequency: Every 5-15 minutes
- Method: POST
- Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

**Option C: GitHub Actions (Free)**
Create `.github/workflows/check-gmail.yml`:

```yaml
name: Check Gmail Replies

on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-gmail:
    runs-on: ubuntu-latest
    steps:
      - name: Call Gmail Check Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
```

---

## Option 3: Manual Testing/Trigger

For testing purposes, you can manually trigger the webhook:

```bash
# Test the webhook directly
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"message":{"data":"eyJlbWFpbEFkZHJlc3MiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoiMTIzNDU2In0="}}' \
  https://ypmyzbtgossmizklszek.supabase.co/functions/v1/gmail-webhook
```

Or use the polling function:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
```

---

## Troubleshooting

### Webhook Not Receiving Notifications

1. **Check Pub/Sub subscription status**
   - Go to Pub/Sub → Subscriptions
   - Check if messages are being delivered
   - Check the "Dead letter" messages if any

2. **Verify webhook URL is accessible**
   ```bash
   curl https://ypmyzbtgossmizklszek.supabase.co/functions/v1/gmail-webhook
   ```
   Should return a response (even if it's an error)

3. **Check Supabase function logs**
   - Supabase Dashboard → Edge Functions → gmail-webhook → Logs
   - Look for errors or incoming requests

4. **Verify Gmail watch is active**
   - Gmail watch expires after 7 days
   - You need to renew it periodically
   - Check watch status in Gmail API

### Messages Not Appearing in Conversations

1. **Check if conversation thread exists**
   - Verify the recruiter email matches exactly
   - Check database: `SELECT * FROM conversation_threads WHERE recruiter_email = 'recruiter@example.com'`

2. **Check message creation**
   - Verify messages are being created: `SELECT * FROM conversation_messages WHERE sender_type = 'recruiter'`

3. **Check user_id matching**
   - Ensure the user_id in threads matches the logged-in user

### Gmail Watch Expiration

Gmail watch expires after 7 days. You need to:

1. **Set up a renewal job** that runs daily
2. **Check watch expiration** before it expires
3. **Renew the watch** using the same API call

Create a function to renew watches:

```typescript
// In a cron job or scheduled function
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, google_refresh_token, gmail_watch_expires_at")
  .not("google_refresh_token", "is", null);

for (const profile of profiles) {
  // Check if watch expires in next 24 hours
  if (profile.gmail_watch_expires_at && 
      new Date(profile.gmail_watch_expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
    // Renew watch
    // ... (same watch API call as in oauth callback)
  }
}
```

---

## Recommended Approach

For production, I recommend:

1. **Start with Option 2 (Periodic Polling)** - Easier to set up and debug
2. **Move to Option 1 (Push Notifications)** - More efficient and real-time, once you're comfortable with the setup

The polling approach is simpler and doesn't require Pub/Sub setup, but it checks for messages every few minutes instead of receiving instant notifications.

---

## Security Notes

- Never commit service account keys to git
- Use Supabase secrets for all sensitive credentials
- The webhook should verify Pub/Sub message authenticity
- Consider rate limiting to prevent abuse
- Monitor function logs for suspicious activity

---

## Next Steps

1. Choose your preferred option (Polling is easier to start with)
2. Set up the chosen method
3. Test by sending an email and having someone reply
4. Monitor the logs to ensure everything works
5. Set up watch renewal if using push notifications

Need help with any specific step? Let me know!

