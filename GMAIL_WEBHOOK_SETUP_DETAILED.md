# Gmail Webhook Setup - Detailed Step-by-Step Guide

This is a detailed, beginner-friendly guide with exact navigation paths and what to look for in each step.

---

## Option 1: Gmail Push Notifications (Advanced - Skip to Option 2 if this is too complex)

### Step 1: Set Up Google Cloud Pub/Sub

#### 1.1: Go to Google Cloud Console

1. **Open your browser** and go to: https://console.cloud.google.com/
2. **Sign in** with your Google account (the same one you use for Gmail API)
3. **Select or Create a Project**:
   - If you see a project dropdown at the top, click it
   - If you don't have a project, click **"Select a project"** → **"NEW PROJECT"**
   - Name it something like: `jobseeker-gmail-webhook`
   - Click **"CREATE"**
   - Wait for it to be created, then select it from the dropdown

#### 1.2: Enable Required APIs

1. **In the Google Cloud Console**, look at the left sidebar menu (hamburger menu ☰ at the top left)
2. Click **"APIs & Services"** → **"Library"**
   - If you don't see this, click the ☰ menu icon first
   - Scroll down to find "APIs & Services"
3. **Enable Gmail API**:
   - In the search bar at the top, type: `Gmail API`
   - Click on **"Gmail API"** from the results
   - Click the blue **"ENABLE"** button
   - Wait for it to enable (you'll see a checkmark)
4. **Enable Cloud Pub/Sub API**:
   - Go back to **"APIs & Services"** → **"Library"** (or search again)
   - Search for: `Cloud Pub/Sub API`
   - Click on **"Cloud Pub/Sub API"**
   - Click the blue **"ENABLE"** button
   - Wait for it to enable

#### 1.3: Create a Pub/Sub Topic

1. **Open the left sidebar menu** (☰)
2. Scroll down and find **"Pub/Sub"** (it might be under "Integration" or "Serverless")
   - If you can't find it, use the search bar at the top and type: `Pub/Sub`
3. Click **"Pub/Sub"** → **"Topics"** (should be the default page)
4. **Create a new topic**:
   - Click the blue **"CREATE TOPIC"** button at the top
   - **Topic ID**: Enter `gmail-notifications` (or any name you like)
   - Leave other settings as default
   - Click **"CREATE"** at the bottom
5. **Note the topic name**: After creation, you'll see something like:
   - `projects/your-project-id/topics/gmail-notifications`
   - Copy this full path - you'll need it later

#### 1.4: Create a Pub/Sub Subscription

1. **Still in Pub/Sub**, click on the topic you just created (`gmail-notifications`)
2. **At the top**, you'll see tabs like "Overview", "Messages", "Subscriptions"
3. Click the **"Subscriptions"** tab
4. Click **"CREATE SUBSCRIPTION"** button
5. **Fill in the form**:
   - **Subscription ID**: `gmail-webhook-subscription`
   - **Delivery type**: Select **"Push"** (not Pull)
   - **Endpoint URL**: 
     ```
     https://ypmyzbtgossmizklszek.supabase.co/functions/v1/gmail-webhook
     ```
   - **Authentication**: Leave as default (or select "No authentication" if available)
6. Click **"CREATE"** at the bottom

**Note**: If you get an error about the endpoint not being accessible, that's okay for now. We'll fix it after deploying.

#### 1.5: Set Up Authentication (Service Account)

1. **Open the left sidebar menu** (☰)
2. Go to **"IAM & Admin"** → **"Service Accounts"**
   - If you don't see "IAM & Admin", search for it in the top search bar
3. **Create a service account**:
   - Click the blue **"CREATE SERVICE ACCOUNT"** button at the top
   - **Service account name**: `gmail-webhook-service`
   - **Service account ID**: Will auto-fill (leave as is)
   - Click **"CREATE AND CONTINUE"**
4. **Grant role**:
   - In the "Grant this service account access to project" section:
   - Click **"Select a role"** dropdown
   - Type: `Pub/Sub Subscriber`
   - Select **"Pub/Sub Subscriber"** from the list
   - Click **"CONTINUE"**
5. **Skip optional steps**:
   - Click **"DONE"** (you can skip "Grant users access" and "Grant access to users")

#### 1.6: Create Service Account Key

1. **You should still be on the Service Accounts page**
2. **Click on the service account** you just created (`gmail-webhook-service`)
3. **Go to the "KEYS" tab** (at the top of the page)
4. **Create a new key**:
   - Click **"ADD KEY"** → **"Create new key"**
   - Select **"JSON"** (not P12)
   - Click **"CREATE"**
5. **Download the key**:
   - A JSON file will automatically download to your computer
   - **IMPORTANT**: Keep this file safe! It contains sensitive credentials
   - The file will look something like: `your-project-id-abc123.json`
   - Open it in a text editor - you'll need its contents in the next step

### Step 2: Configure Supabase Secrets

#### 2.1: Get Your Supabase Credentials

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `ypmyzbtgossmizklszek` (or your project name)
3. **Get Service Role Key**:
   - Click **"Settings"** (gear icon) in the left sidebar
   - Click **"API"** in the settings menu
   - Find **"service_role"** key (it's the "secret" key, not the "anon" key)
   - Click the **eye icon** to reveal it, then **copy it**
   - **WARNING**: This is a secret key - never share it publicly!

#### 2.2: Set Pub/Sub Credentials in Supabase

**Option A: Using the downloaded JSON file** (Recommended)

1. **Open the JSON file** you downloaded earlier (the service account key)
2. **Copy the entire contents** of the file
3. **Open your terminal** (Terminal on Mac, Command Prompt on Windows)
4. **Navigate to your project folder**:
   ```bash
   cd "/Users/kaushik/Desktop/Jobseeker Revamp/job-connect-hub-main"
   ```
5. **Set the secret** (replace `<paste JSON content>` with the actual JSON):
   ```bash
   supabase secrets set GOOGLE_CLOUD_SERVICE_ACCOUNT='<paste entire JSON content here>'
   ```
   
   **Example** (don't use this exact value, use your own):
   ```bash
   supabase secrets set GOOGLE_CLOUD_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```

**Option B: Set individual values** (Alternative)

If Option A doesn't work, you can set individual values from the JSON file:

1. **Open the JSON file** and find these values:
   - `project_id` (e.g., "my-project-12345")
   - The topic name you created (e.g., "gmail-notifications")

2. **Set them in Supabase**:
   ```bash
   supabase secrets set GOOGLE_CLOUD_PROJECT_ID='your-project-id-from-json'
   supabase secrets set GOOGLE_CLOUD_TOPIC_NAME='gmail-notifications'
   ```

### Step 3: Update Gmail OAuth Callback (Enable Watch)

You need to modify the Gmail OAuth callback function to enable Gmail watch when users connect their Gmail.

1. **Open the file**: `supabase/functions/gmail-oauth-callback/index.ts`
2. **Find where the access token is obtained** (after the token refresh)
3. **Add this code** right after getting the access token:

```typescript
// After successfully getting the access token, add Gmail watch
try {
  // Replace YOUR_PROJECT_ID with your actual Google Cloud project ID
  const googleCloudProjectId = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID") || "your-project-id";
  
  const watchResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName: `projects/${googleCloudProjectId}/topics/gmail-notifications`,
        labelIds: ["INBOX"], // Watch for messages in inbox
      }),
    }
  );

  if (watchResponse.ok) {
    const watchData = await watchResponse.json();
    console.log("Gmail watch enabled:", watchData);
    
    // Store expiration time (usually 7 days from now)
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + 7);
    
    // Update profile with watch expiration
    await supabase
      .from("profiles")
      .update({
        gmail_watch_expires_at: expirationTime.toISOString(),
      })
      .eq("id", user.id);
  } else {
    const errorText = await watchResponse.text();
    console.error("Failed to enable Gmail watch:", errorText);
  }
} catch (error) {
  console.error("Error setting up Gmail watch:", error);
  // Don't fail the OAuth flow if watch setup fails
}
```

4. **Save the file** and **redeploy the function**:
   ```bash
   supabase functions deploy gmail-oauth-callback
   ```

### Step 4: Test the Setup

1. **Disconnect and reconnect Gmail** in your app (to trigger the OAuth callback with watch setup)
2. **Send a test email** from your app to a recruiter
3. **Have someone reply** (or send yourself a test reply from another email)
4. **Check Supabase logs**:
   - Go to Supabase Dashboard → **Edge Functions** → **gmail-webhook** → **Logs**
   - You should see incoming webhook requests
5. **Check the Conversations page** - the reply should appear automatically

---

## Option 2: Periodic Polling (EASIER - Recommended to Start)

This is much simpler and doesn't require Google Cloud Pub/Sub setup!

### Step 1: The Function is Already Created

✅ The `check-gmail-replies` function is already created and deployed!

### Step 2: Set Up a Cron Job

You need to call this function every 5-15 minutes. Here are three easy options:

#### Option A: Use cron-job.org (Easiest - Free)

1. **Go to**: https://cron-job.org/
2. **Create a free account** (or sign in)
3. **Click "Create cronjob"** (or the + button)
4. **Fill in the form**:
   - **Title**: `Check Gmail Replies`
   - **Address (URL)**: 
     ```
     https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
     ```
   - **Request method**: Select **"POST"**
   - **Request headers**: Click "Add header"
     - **Name**: `Authorization`
     - **Value**: `Bearer YOUR_SERVICE_ROLE_KEY`
       - (Get this from Supabase Dashboard → Settings → API → service_role key)
   - **Schedule**: 
     - Select **"Every X minutes"**
     - Enter `10` (checks every 10 minutes)
   - **Active**: Make sure it's checked ✅
5. **Click "Create"** or **"Save"**

**That's it!** The cron job will now call your function every 10 minutes.

#### Option B: Use GitHub Actions (Free - If you use GitHub)

1. **Create a new file** in your project: `.github/workflows/check-gmail.yml`
2. **Add this content**:

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

3. **Add the secret to GitHub**:
   - Go to your GitHub repository
   - Click **"Settings"** → **"Secrets and variables"** → **"Actions"**
   - Click **"New repository secret"**
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Paste your service role key from Supabase
   - Click **"Add secret"**
4. **Commit and push** the workflow file
5. **GitHub will automatically run it** every 10 minutes

#### Option C: Manual Testing (For Testing Only)

You can manually trigger the function to test it:

1. **Get your service role key**:
   - Supabase Dashboard → Settings → API → service_role key

2. **Run this command in terminal**:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
   ```

3. **You should see a response** like:
   ```json
   {"success":true,"processed":1,"errors":0,"users_checked":1}
   ```

### Step 3: Test It Works

1. **Send an email** from your app to a recruiter
2. **Have the recruiter reply** (or send yourself a test reply)
3. **Wait 10 minutes** (or manually trigger the function)
4. **Check the Conversations page** - the reply should appear!

---

## Which Option Should You Choose?

### Start with Option 2 (Polling) ✅
- ✅ Much easier to set up
- ✅ No Google Cloud setup required
- ✅ Works immediately
- ✅ Easy to debug
- ⚠️ Checks every 10 minutes (not instant)

### Upgrade to Option 1 (Push) Later
- ✅ Instant notifications
- ✅ More efficient
- ⚠️ Requires Google Cloud setup
- ⚠️ More complex
- ⚠️ Needs watch renewal every 7 days

---

## Troubleshooting

### "I can't find Pub/Sub in Google Cloud Console"

1. Make sure you've **enabled the Pub/Sub API** (Step 1.2)
2. Try using the **search bar** at the top of Google Cloud Console
3. Type: `Pub/Sub` and click on it from the results

### "I can't find Service Accounts"

1. Look for **"IAM & Admin"** in the left sidebar
2. If you don't see it, use the **search bar** at the top
3. Type: `Service Accounts` and click on it

### "The cron job isn't working"

1. **Check the URL** is correct (no typos)
2. **Check the Authorization header** has the correct service role key
3. **Check Supabase logs**:
   - Supabase Dashboard → Edge Functions → check-gmail-replies → Logs
   - Look for errors

### "Messages aren't appearing in Conversations"

1. **Check if the function ran**:
   - Look at Supabase function logs
   - You should see "Created conversation message" logs

2. **Check the database**:
   - Go to Supabase Dashboard → Table Editor
   - Check `conversation_threads` table - do you see threads?
   - Check `conversation_messages` table - do you see messages with `sender_type = 'recruiter'`?

3. **Verify email addresses match**:
   - The recruiter's email in the reply must match exactly
   - Check for typos or different email formats

---

## Quick Start Checklist (Option 2 - Polling)

- [ ] Function `check-gmail-replies` is deployed ✅ (Already done!)
- [ ] Get service role key from Supabase Dashboard
- [ ] Set up cron job on cron-job.org (or GitHub Actions)
- [ ] Test by sending an email and getting a reply
- [ ] Check Conversations page after 10 minutes
- [ ] Verify messages appear correctly

---

## Need More Help?

If you're stuck on a specific step:
1. Take a screenshot of what you see
2. Note which step number you're on
3. Describe what you expected to see vs. what you actually see

The polling option (Option 2) is the easiest way to get started and should work immediately!

