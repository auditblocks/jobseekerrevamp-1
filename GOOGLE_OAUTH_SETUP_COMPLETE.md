# Google OAuth Setup - Complete ✅

## Credentials Configured

### Client ID
```
YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

### Client Secret
```
YOUR_CLIENT_SECRET_HERE
```

---

## Where Credentials Are Stored

### ✅ 1. Supabase Secrets (Server-Side)
**Location**: Supabase Dashboard → Settings → Edge Functions → Secrets

**Secrets Set**:
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅

**Used By**:
- `supabase/functions/gmail-oauth-callback/index.ts`
- `supabase/functions/send-email-gmail/index.ts`
- `supabase/functions/check-gmail-replies/index.ts`
- `supabase/functions/gmail-webhook/index.ts`
- `supabase/functions/get-google-client-id/index.ts`

**Verify**:
```bash
supabase secrets list | grep GOOGLE
```

### ✅ 2. Local .env File (Frontend)
**Location**: Project root → `.env`

**Variable Set**:
- `VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com`

**Used By**:
- `src/pages/Compose.tsx` (line 188)

**Note**: 
- `.env` is in `.gitignore` (won't be committed)
- Client Secret is NOT in `.env` (server-side only)

### ✅ 3. Netlify Environment Variables
**Location**: Netlify Dashboard → Site settings → Environment variables

**Variables Set** (as mentioned by you):
- `VITE_GOOGLE_CLIENT_ID` ✅
- Any other required variables

---

## How It Works

### Frontend Flow
1. **Compose.tsx** reads `VITE_GOOGLE_CLIENT_ID` from `.env`
2. If not found, falls back to `get-google-client-id` edge function
3. Uses Client ID to initiate OAuth flow
4. Redirects to Google for authorization

### Backend Flow
1. **gmail-oauth-callback** receives OAuth code
2. Uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Supabase secrets
3. Exchanges code for access/refresh tokens
4. Stores refresh token in database

---

## Verification Checklist

- [x] Supabase secrets set (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`)
- [x] Local `.env` file created with `VITE_GOOGLE_CLIENT_ID`
- [x] `.env` is in `.gitignore` (won't be committed)
- [x] Netlify environment variables set
- [x] Google Cloud Console OAuth client configured
- [x] Authorized redirect URIs added in Google Console

---

## Testing

### Test Gmail Connection
1. Go to your app: `https://startworking.in/compose`
2. Click "Connect Gmail"
3. Should redirect to Google OAuth
4. After authorization, should redirect back
5. Gmail should be connected ✅

### Verify Secrets
```bash
# Check Supabase secrets
supabase secrets list | grep GOOGLE

# Should show:
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET
```

### Verify .env File
```bash
# Check .env file exists
cat .env

# Should show:
# VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

---

## Security Notes

✅ **Client ID** - Safe to expose (public, used in frontend)
✅ **Client Secret** - Must stay secret (only in Supabase secrets, never in frontend)
✅ **.env file** - In `.gitignore`, won't be committed
✅ **Supabase secrets** - Encrypted and secure

---

## Troubleshooting

### "Google OAuth is not configured"
- Check `.env` file exists and has `VITE_GOOGLE_CLIENT_ID`
- Restart dev server after creating `.env`
- Check Netlify environment variables are set

### "Failed to connect Gmail"
- Verify Supabase secrets are set correctly
- Check Google Cloud Console redirect URIs match exactly
- Check browser console for errors

### "Redirect URI mismatch"
- Ensure redirect URI in Google Console is: `https://startworking.in/compose`
- Must match exactly (no trailing slash, correct protocol)

---

## Next Steps

1. ✅ Credentials are configured
2. ✅ Test Gmail connection in your app
3. ✅ Send a test email
4. ✅ Verify it appears in Conversations page

Everything is set up and ready to use! 🎉

