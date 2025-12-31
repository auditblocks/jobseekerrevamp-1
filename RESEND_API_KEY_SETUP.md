# Resend API Key Setup

## Overview
The Resend API key is required for sending emails via the Resend service. This key needs to be configured in Supabase Secrets for the edge functions to work.

## API Key
```
re_gRSNr18j_AeJaWoRysvGLLhZxX9x4y5Qc
```

## Setup Instructions

### 1. Add to Supabase Secrets

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Click **Add Secret**
5. Enter the following:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_gRSNr18j_AeJaWoRysvGLLhZxX9x4y5Qc`
6. Click **Save**

### 2. Edge Functions Using This Key

The following edge functions require the `RESEND_API_KEY`:

- `send-email-resend` - Sends individual emails via Resend
- `send-email-campaign` - Sends email campaigns via Resend

### 3. Verify Setup

After adding the secret, redeploy the edge functions:

```bash
supabase functions deploy send-email-resend
supabase functions deploy send-email-campaign
```

Or use the Supabase Dashboard to redeploy the functions.

### 4. Testing

To test if the API key is working:

1. Try sending an email through the Compose page (if using Resend)
2. Try creating and sending an email campaign from the admin portal
3. Check the edge function logs in Supabase Dashboard for any errors

## Security Notes

- ⚠️ **Never commit the API key to version control**
- ⚠️ **Keep the API key secure and don't share it publicly**
- ✅ The key is stored securely in Supabase Secrets
- ✅ Edge functions access it via `Deno.env.get("RESEND_API_KEY")`

## Troubleshooting

If you encounter "RESEND_API_KEY not configured" errors:

1. Verify the secret is added in Supabase Dashboard
2. Check the secret name is exactly `RESEND_API_KEY` (case-sensitive)
3. Redeploy the edge functions after adding the secret
4. Check edge function logs for detailed error messages

