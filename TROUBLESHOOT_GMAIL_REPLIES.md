# Troubleshoot: Gmail Replies Not Appearing in Conversations

## Issue
Cron job is running, but recruiter replies are not appearing in the conversation section.

## Since You Set Up New Google OAuth

If you've set up a **new Google OAuth**, you need to:

1. ✅ **Update Supabase Secrets** with new Client ID and Secret
2. ✅ **Reconnect Gmail** in your app to get new refresh token
3. ✅ **Verify the function is using correct credentials**

---

## Step-by-Step Troubleshooting

### Step 1: Verify Supabase Secrets Are Updated

The `check-gmail-replies` function uses these secrets:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Check current secrets:**
```bash
supabase secrets list | grep GOOGLE
```

**Update if needed:**
```bash
supabase secrets set GOOGLE_CLIENT_ID='your-new-client-id'
supabase secrets set GOOGLE_CLIENT_SECRET='your-new-client-secret'
```

### Step 2: Reconnect Gmail Account

**Important**: After setting up new Google OAuth, you MUST reconnect your Gmail account:

1. Go to your app: https://startworking.in/compose
2. **Disconnect** your Gmail account (if connected)
3. **Reconnect** your Gmail account
4. This will generate a new `google_refresh_token` using the new OAuth credentials

**Why?** The old refresh token was created with the old OAuth credentials and won't work with the new ones.

### Step 3: Verify Gmail Connection

Check if your profile has a refresh token:

1. Go to Supabase Dashboard → Table Editor → `profiles`
2. Find your user profile
3. Check if `google_refresh_token` field has a value
4. If empty or null, you need to reconnect Gmail

### Step 4: Check Cron Job Logs

1. Go to Supabase Dashboard → Edge Functions → `check-gmail-replies`
2. Click on **"Logs"** tab
3. Look for recent executions
4. Check for errors like:
   - "Failed to refresh token" → OAuth credentials mismatch
   - "No users with Gmail connected" → No refresh token in database
   - "Skipping email - no existing conversation thread" → Thread not created when email was sent

### Step 5: Verify Conversation Threads Exist

The function **only processes replies** if a conversation thread already exists.

**Check if threads exist:**
1. Go to Supabase Dashboard → Table Editor → `conversation_threads`
2. Check if you have threads for recruiters you've emailed
3. If no threads exist, the emails you sent didn't create threads

**Fix**: Make sure you're sending emails through the app (not manually), and the `send-email-gmail` function is creating threads.

### Step 6: Test the Function Manually

Test the function to see what's happening:

1. Get your service role key from Supabase Dashboard → Settings → API
2. Run:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
```

3. Check the response:
   - `"processed": 0` → No emails found or threads don't exist
   - `"users_checked": 0` → No users with Gmail connected
   - `"errors": X` → Check logs for error details

---

## Common Issues and Fixes

### Issue 1: "Failed to refresh token"

**Cause**: OAuth credentials mismatch
- Old refresh token with new OAuth credentials
- Wrong Client ID/Secret in Supabase secrets

**Fix**:
1. Update Supabase secrets with new OAuth credentials
2. Reconnect Gmail account in your app
3. Redeploy edge functions

### Issue 2: "No users with Gmail connected"

**Cause**: No `google_refresh_token` in profiles table

**Fix**:
1. Go to your app
2. Connect Gmail account
3. Verify `google_refresh_token` is saved in database

### Issue 3: "Skipping email - no existing conversation thread"

**Cause**: Email was sent but thread wasn't created, OR email address doesn't match

**Fix**:
1. Check `conversation_threads` table
2. Verify `recruiter_email` matches exactly (case-insensitive)
3. Make sure you sent email through the app (not manually)
4. Check if `send-email-gmail` function is creating threads

### Issue 4: "Skipping email - not a reply"

**Cause**: Email doesn't have "Re:" in subject or reply headers

**Fix**:
- This is expected behavior - only actual replies are processed
- If recruiter sends a new email (not a reply), it won't be processed
- They need to reply to your email for it to appear

### Issue 5: Emails Already Marked as Read

**Cause**: Function only checks unread emails from last 24 hours

**Fix**:
- Make sure recruiter reply is **unread** in Gmail
- Reply must be from **last 24 hours**
- Function marks emails as read after processing

---

## Quick Checklist

- [ ] Updated `GOOGLE_CLIENT_ID` in Supabase secrets
- [ ] Updated `GOOGLE_CLIENT_SECRET` in Supabase secrets
- [ ] Reconnected Gmail account in app (to get new refresh token)
- [ ] Verified `google_refresh_token` exists in `profiles` table
- [ ] Verified `conversation_threads` exist for recruiters you've emailed
- [ ] Checked cron job logs for errors
- [ ] Tested function manually
- [ ] Recruiter reply is unread and from last 24 hours
- [ ] Recruiter reply has "Re:" in subject or is part of email thread

---

## Debug Steps

### 1. Check Your Profile
```sql
SELECT id, email, google_refresh_token 
FROM profiles 
WHERE email = 'your-email@example.com';
```

Should show a `google_refresh_token` value.

### 2. Check Conversation Threads
```sql
SELECT * 
FROM conversation_threads 
WHERE user_id = 'your-user-id';
```

Should show threads for recruiters you've emailed.

### 3. Check Recent Messages
```sql
SELECT * 
FROM conversation_messages 
WHERE sender_type = 'recruiter' 
ORDER BY sent_at DESC 
LIMIT 10;
```

Should show recent recruiter replies if they're being processed.

---

## After Setting Up New Google OAuth

**Required Steps:**

1. ✅ Update Supabase secrets:
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID='new-client-id'
   supabase secrets set GOOGLE_CLIENT_SECRET='new-client-secret'
   ```

2. ✅ Redeploy edge functions:
   ```bash
   supabase functions deploy check-gmail-replies
   supabase functions deploy send-email-gmail
   supabase functions deploy gmail-oauth-callback
   ```

3. ✅ Reconnect Gmail in your app:
   - Go to app → Compose page
   - Disconnect Gmail (if connected)
   - Reconnect Gmail
   - This creates new refresh token with new OAuth

4. ✅ Test:
   - Send a test email to a recruiter
   - Have recruiter reply
   - Wait for cron job to run (or trigger manually)
   - Check conversations page

---

## Still Not Working?

1. **Check Supabase Logs**: Edge Functions → check-gmail-replies → Logs
2. **Check Database**: Verify threads and messages are being created
3. **Test Manually**: Use curl command to test function
4. **Verify OAuth**: Make sure new OAuth is properly configured
5. **Check Email**: Make sure recruiter actually replied (not just sent new email)

