# Fix: "Failed to refresh token" Error

## Error Message
```
"Failed to refresh token for user 5b93ecc4-90da-4b1f-b9a6-f9a5ddb7f0ad"
```

## Root Cause
The `google_refresh_token` stored in your database was created with the **old Google OAuth credentials**. After setting up new OAuth, the old refresh token is invalid.

## Solution

### Option 1: Reconnect Gmail Account (Recommended)

This is the easiest fix - reconnect your Gmail to get a new refresh token.

1. **Go to your app**: https://startworking.in/compose
2. **Disconnect Gmail** (if currently connected):
   - Click "Disconnect Gmail" button
   - Confirm disconnection
3. **Reconnect Gmail**:
   - Click "Connect Gmail" button
   - Authorize with Google
   - This will create a new `google_refresh_token` using your new OAuth credentials
4. **Verify**: Check that Gmail connection shows as "Connected"

### Option 2: Update Refresh Token Manually (If Option 1 Doesn't Work)

If reconnecting doesn't work, you can manually update the token:

1. **Get new refresh token**:
   - Disconnect and reconnect Gmail in your app
   - Or use Google OAuth Playground to get a new token
2. **Update in database**:
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Find your user (ID: `5b93ecc4-90da-4b1f-b9a6-f9a5ddb7f0ad`)
   - Update `google_refresh_token` field with new token

---

## Verify OAuth Credentials

Before reconnecting, make sure Supabase secrets are correct:

### Check Current Secrets
```bash
supabase secrets list | grep GOOGLE
```

### Update if Needed
```bash
# Update with your new OAuth credentials
supabase secrets set GOOGLE_CLIENT_ID='your-google-client-id.apps.googleusercontent.com'
supabase secrets set GOOGLE_CLIENT_SECRET='GOCSPX-your-client-secret-here'
```

### Redeploy Functions
After updating secrets, redeploy the function:
```bash
supabase functions deploy check-gmail-replies
```

---

## Step-by-Step Fix

### Step 1: Verify Supabase Secrets
1. Check if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
2. They should match your new OAuth credentials
3. Update if they don't match

### Step 2: Reconnect Gmail
1. Go to: https://startworking.in/compose
2. Disconnect Gmail (if connected)
3. Reconnect Gmail
4. Complete OAuth flow
5. Verify connection shows as "Connected"

### Step 3: Verify New Token
1. Go to Supabase Dashboard → Table Editor → `profiles`
2. Find your user profile
3. Check `google_refresh_token` field
4. Should have a new value (different from before)

### Step 4: Test Function
1. Wait for next cron job run, OR
2. Manually trigger the function:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
   ```
3. Check logs - should not show "Failed to refresh token" error

---

## Why This Happens

When you set up new Google OAuth:
- ✅ New Client ID and Secret are created
- ❌ Old refresh tokens become invalid
- ❌ Old tokens were created with old OAuth credentials
- ✅ New tokens must be created with new OAuth credentials

**Solution**: Reconnect Gmail to generate a new refresh token with the new OAuth.

---

## After Fixing

Once you reconnect Gmail:
1. ✅ New refresh token will be stored in database
2. ✅ Function will be able to refresh access tokens
3. ✅ Cron job will successfully check for replies
4. ✅ Recruiter replies will appear in conversations

---

## Quick Checklist

- [ ] Verify `GOOGLE_CLIENT_ID` in Supabase secrets matches new OAuth
- [ ] Verify `GOOGLE_CLIENT_SECRET` in Supabase secrets matches new OAuth
- [ ] Disconnect Gmail in your app
- [ ] Reconnect Gmail in your app
- [ ] Verify `google_refresh_token` is updated in `profiles` table
- [ ] Test function manually or wait for cron job
- [ ] Check logs - should not show refresh token errors

---

## Still Getting Error?

If you still get "Failed to refresh token" after reconnecting:

1. **Check OAuth Redirect URI**:
   - Make sure redirect URI in Google Console matches: `https://startworking.in/compose`
   - Must match exactly (no trailing slash)

2. **Check OAuth Scopes**:
   - Should include: `gmail.send` and `gmail.readonly`
   - Verify in Google Cloud Console → OAuth consent screen

3. **Check Token Storage**:
   - Verify token is being saved correctly in database
   - Check `profiles.google_refresh_token` field

4. **Check Function Logs**:
   - Look for more detailed error messages
   - Check if it's an OAuth error or token error

---

## Summary

**The fix is simple**: Reconnect your Gmail account in the app to get a new refresh token that works with your new OAuth credentials.

**Time**: 2 minutes to reconnect Gmail

**Result**: Function will work correctly and recruiter replies will appear in conversations! ✅

