# Debug: Refresh Token Still Failing After Reconnect

## Issue
Still getting "Failed to refresh token" error even after reconnecting Gmail.

## Possible Causes

1. **Supabase secrets don't match new OAuth credentials**
2. **Refresh token not being saved correctly**
3. **OAuth callback using wrong credentials**

---

## Step 1: Verify Supabase Secrets Match New OAuth

Your new OAuth credentials should be:
- **Client ID**: `your-google-client-id.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-your-client-secret-here`

**Update Supabase secrets:**
```bash
supabase secrets set GOOGLE_CLIENT_ID='your-google-client-id.apps.googleusercontent.com'
supabase secrets set GOOGLE_CLIENT_SECRET='GOCSPX-your-client-secret-here'
```

**Verify they're set:**
```bash
supabase secrets list | grep GOOGLE_CLIENT
```

---

## Step 2: Check if Refresh Token Was Actually Updated

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/ypmyzbtgossmizklszek
2. **Table Editor** → `profiles` table
3. **Find your user** (ID: `5b93ecc4-90da-4b1f-b9a6-f9a5ddb7f0ad`)
4. **Check `google_refresh_token` field**:
   - Should have a value (not null/empty)
   - Should be different from before reconnecting
   - Should be a long string starting with something like `1//...`

**If token is null or old:**
- The OAuth callback didn't save the token
- Check `gmail-oauth-callback` function logs for errors

---

## Step 3: Check OAuth Callback Logs

1. **Go to Supabase Dashboard** → Edge Functions → `gmail-oauth-callback` → Logs
2. **Look for recent executions** when you reconnected Gmail
3. **Check for errors**:
   - "Token exchange failed" → OAuth credentials mismatch
   - "Failed to store token" → Database error
   - Any other errors

---

## Step 4: Verify OAuth Redirect URI

The redirect URI in Google Console must match exactly:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. **Click your OAuth 2.0 Client ID**
4. **Check "Authorized redirect URIs"**:
   - Should include: `https://startworking.in/compose`
   - Must match exactly (no trailing slash, correct protocol)

---

## Step 5: Test Token Refresh Manually

After updating secrets and redeploying, test manually:

1. **Get your service role key** from Supabase Dashboard → Settings → API
2. **Run test:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
```

3. **Check the response and logs** for detailed error messages

---

## Step 6: Improved Error Logging

I've updated the function to show more detailed errors. After redeploying, check logs again:

1. **Redeploy the function:**
```bash
supabase functions deploy check-gmail-replies
```

2. **Wait for next cron run or trigger manually**
3. **Check logs** - should now show the actual Google error message

---

## Common Issues

### Issue 1: Secrets Not Updated
**Symptom**: Function still uses old credentials
**Fix**: Update secrets and redeploy functions

### Issue 2: Token Not Saved
**Symptom**: `google_refresh_token` is null or old value
**Fix**: 
- Check OAuth callback logs
- Reconnect Gmail again
- Verify token is saved in database

### Issue 3: Redirect URI Mismatch
**Symptom**: OAuth callback fails
**Fix**: Update redirect URI in Google Console

### Issue 4: Wrong OAuth Project
**Symptom**: Token created with different OAuth project
**Fix**: Make sure you're using the same OAuth project everywhere

---

## Complete Fix Checklist

- [ ] Update `GOOGLE_CLIENT_ID` in Supabase secrets (new value)
- [ ] Update `GOOGLE_CLIENT_SECRET` in Supabase secrets (new value)
- [ ] Redeploy `gmail-oauth-callback` function
- [ ] Redeploy `check-gmail-replies` function
- [ ] Verify redirect URI in Google Console matches `https://startworking.in/compose`
- [ ] Disconnect Gmail in app
- [ ] Reconnect Gmail in app
- [ ] Verify `google_refresh_token` is updated in database
- [ ] Check OAuth callback logs for errors
- [ ] Test function manually
- [ ] Check improved error logs

---

## Quick Fix Command

Run these commands in order:

```bash
# 1. Update secrets
supabase secrets set GOOGLE_CLIENT_ID='your-google-client-id.apps.googleusercontent.com'
supabase secrets set GOOGLE_CLIENT_SECRET='GOCSPX-your-client-secret-here'

# 2. Redeploy functions
supabase functions deploy gmail-oauth-callback
supabase functions deploy check-gmail-replies

# 3. Then reconnect Gmail in your app
```

---

## After Fixing

1. ✅ Secrets updated with new OAuth credentials
2. ✅ Functions redeployed
3. ✅ Gmail reconnected (new token saved)
4. ✅ Function should work without errors
5. ✅ Recruiter replies will appear in conversations

---

## Still Not Working?

If still failing after all steps:

1. **Check detailed error logs** (after redeploy with improved logging)
2. **Verify OAuth credentials** are correct in Google Console
3. **Check if token is actually being saved** in database
4. **Verify redirect URI** matches exactly
5. **Check OAuth callback logs** for any errors during token exchange

The improved error logging will show the exact Google error message, which will help identify the specific issue.

