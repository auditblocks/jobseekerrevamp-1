# Quick Test Guide - Check Gmail Replies Function

## Step 1: Get Your Service Role Key

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/ypmyzbtgossmizklszek
2. Click **Settings** → **API**
3. Find **service_role** key (the "secret" one, not "anon")
4. Click the eye icon to reveal it
5. Copy it

## Step 2: Test the Function Manually

Run this command in your terminal (replace `YOUR_SERVICE_ROLE_KEY` with the actual key):

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-gmail-replies
```

## Expected Response

If it works, you should see:
```json
{
  "success": true,
  "processed": 1,
  "errors": 0,
  "users_checked": 1
}
```

## What to Check

1. **If you get "No users with Gmail connected"**:
   - Make sure you've connected your Gmail account in the app
   - Check that `google_refresh_token` is stored in the `profiles` table

2. **If you get errors**:
   - Check Supabase Dashboard → Edge Functions → check-gmail-replies → Logs
   - Look for error messages

3. **If processed = 0 but users_checked > 0**:
   - Check if there are actually unread messages in your Gmail inbox
   - The function only processes unread messages from the last 24 hours
   - Make sure the recruiter's reply is unread and in your inbox

## After Testing

Once the manual test works:
1. Set up the GitHub Actions secret (see main instructions)
2. Push the workflow file to GitHub
3. GitHub will automatically run it every 10 minutes

Or use cron-job.org for immediate setup (see below).

