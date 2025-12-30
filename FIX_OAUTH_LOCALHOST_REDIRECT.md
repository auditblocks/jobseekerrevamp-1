# Fix: OAuth Redirecting to Localhost in Production

## Issue
When signing in with Google OAuth in production, the redirect URL is pointing to `localhost:3000` instead of the production domain (`https://startworking.in`).

## Root Cause
The OAuth redirect URL is using `window.location.origin`, which will be `localhost:3000` when testing locally, but should use the production domain in production.

## Solution

### 1. Add Environment Variable

Add `VITE_SITE_URL` to your environment variables:

**Local `.env` file:**
```env
VITE_SITE_URL=http://localhost:3000
```

**Netlify Environment Variables:**
1. Go to Netlify Dashboard → Site settings → Environment variables
2. Add:
   - **Key**: `VITE_SITE_URL`
   - **Value**: `https://startworking.in`
3. Save and redeploy

### 2. Update Supabase Auth Settings

**Important**: You also need to configure Supabase Auth to use the correct Site URL:

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/ypmyzbtgossmizklszek
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to: `https://startworking.in`
4. Add **Redirect URLs**:
   - `https://startworking.in/dashboard`
   - `https://startworking.in/auth`
   - `http://localhost:3000/dashboard` (for local development)
   - `http://localhost:3000/auth` (for local development)
5. Save changes

### 3. Verify Google OAuth Redirect URIs

Make sure your Google OAuth client has the correct redirect URIs:

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Check **Authorized redirect URIs** includes:
   - `https://startworking.in/dashboard`
   - `https://startworking.in/auth`
   - `http://localhost:3000/dashboard` (for local development)
   - `http://localhost:3000/auth` (for local development)

### 4. Code Changes

The code has been updated to:
- Use `VITE_SITE_URL` environment variable if available
- Fall back to `window.location.origin` if not set (for local development)

**Files Updated:**
- `src/pages/Auth.tsx` - Uses `VITE_SITE_URL` for OAuth redirect
- `src/integrations/supabase/client.ts` - Uses `VITE_SITE_URL` for Supabase Auth redirect

## Testing

### Local Development
1. Set `VITE_SITE_URL=http://localhost:3000` in `.env`
2. Restart dev server
3. Test Google sign-in - should redirect to `http://localhost:3000/dashboard`

### Production
1. Set `VITE_SITE_URL=https://startworking.in` in Netlify
2. Redeploy the site
3. Test Google sign-in - should redirect to `https://startworking.in/dashboard`

## Verification Checklist

- [ ] `VITE_SITE_URL` set in Netlify environment variables
- [ ] Supabase Auth Site URL set to `https://startworking.in`
- [ ] Supabase Auth Redirect URLs include production URLs
- [ ] Google OAuth Authorized redirect URIs include production URLs
- [ ] Code changes deployed to production
- [ ] Test sign-in works correctly in production

## Troubleshooting

### Still redirecting to localhost?
1. **Check Netlify environment variables** - Make sure `VITE_SITE_URL` is set correctly
2. **Check Supabase Auth settings** - Site URL must be `https://startworking.in`
3. **Clear browser cache** - Old redirect URLs might be cached
4. **Check browser console** - Look for any errors during OAuth flow

### OAuth works locally but not in production?
- Verify `VITE_SITE_URL` is set in Netlify (not just local `.env`)
- Check Supabase Auth Redirect URLs include production domain
- Verify Google OAuth redirect URIs match exactly

## Important Notes

⚠️ **Supabase Auth Site URL** must match your production domain. This is critical for OAuth to work correctly.

⚠️ **Environment Variables** - `VITE_SITE_URL` must be set in Netlify, not just locally.

⚠️ **Redeploy Required** - After setting environment variables in Netlify, you need to trigger a new deployment.

