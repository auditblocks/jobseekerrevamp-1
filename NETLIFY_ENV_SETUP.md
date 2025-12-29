# Netlify Environment Variables Setup Guide

Complete guide to set up environment variables in Netlify for your Job Seeker AI application.

---

## Required Environment Variables

Your application needs these environment variables in Netlify:

1. **VITE_GOOGLE_CLIENT_ID** - Google OAuth Client ID
2. **VITE_SUPABASE_URL** - Supabase project URL
3. **VITE_SUPABASE_PUBLISHABLE_KEY** - Supabase anon/public key

---

## Method 1: Using Netlify Dashboard (Easiest - Recommended)

### Step 1: Go to Netlify Dashboard

1. **Log in to Netlify**: https://app.netlify.com/
2. **Select your site**: `startworking` (or your site name)
3. **Go to Site settings**: Click on your site → **Site settings**

### Step 2: Navigate to Environment Variables

1. In the left sidebar, click **"Environment variables"**
2. You'll see a list of existing variables (if any)

### Step 3: Add Environment Variables

Click **"Add a variable"** and add each one:

#### Variable 1: VITE_GOOGLE_CLIENT_ID
- **Key**: `VITE_GOOGLE_CLIENT_ID`
- **Value**: `278703971912-233fdcgfpitjd7v3i7713srolgg6cv9v.apps.googleusercontent.com`
- **Scopes**: Select **"All scopes"** (or "Production", "Deploy previews", "Branch deploys" as needed)
- Click **"Save"**

#### Variable 2: VITE_SUPABASE_URL
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://ypmyzbtgossmizklszek.supabase.co`
- **Scopes**: Select **"All scopes"**
- Click **"Save"**

#### Variable 3: VITE_SUPABASE_PUBLISHABLE_KEY
- **Key**: `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Value**: Get this from Supabase Dashboard → Settings → API → **anon/public** key
- **Scopes**: Select **"All scopes"**
- Click **"Save"**

### Step 4: Redeploy

After adding variables, you need to trigger a new deployment:

1. Go to **"Deploys"** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Or push a new commit to trigger auto-deploy

---

## Method 2: Using Netlify CLI

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

This will open your browser to authenticate.

### Step 3: Link Your Site

```bash
cd "/Users/kaushik/Desktop/Jobseeker Revamp/job-connect-hub-main"
netlify link
```

Follow the prompts to select your site.

### Step 4: Set Environment Variables

```bash
# Set Google Client ID
netlify env:set VITE_GOOGLE_CLIENT_ID "278703971912-233fdcgfpitjd7v3i7713srolgg6cv9v.apps.googleusercontent.com"

# Set Supabase URL
netlify env:set VITE_SUPABASE_URL "https://ypmyzbtgossmizklszek.supabase.co"

# Set Supabase Publishable Key (replace with your actual key)
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "your-supabase-anon-key-here"
```

### Step 5: Verify Variables

```bash
netlify env:list
```

### Step 6: Trigger Redeploy

```bash
netlify deploy --prod
```

Or push a commit to trigger auto-deploy.

---

## Get Your Supabase Keys

If you need to get your Supabase keys:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/ypmyzbtgossmizklszek
2. **Click Settings** → **API**
3. **Copy these values**:
   - **Project URL**: `https://ypmyzbtgossmizklszek.supabase.co` (this is your `VITE_SUPABASE_URL`)
   - **anon public key**: Copy the **anon/public** key (this is your `VITE_SUPABASE_PUBLISHABLE_KEY`)
     - ⚠️ **NOT** the service_role key (that's secret and should never be in frontend)

---

## Quick Checklist

- [ ] VITE_GOOGLE_CLIENT_ID set in Netlify
- [ ] VITE_SUPABASE_URL set in Netlify
- [ ] VITE_SUPABASE_PUBLISHABLE_KEY set in Netlify
- [ ] All variables set for "All scopes" or appropriate scopes
- [ ] Site redeployed after setting variables

---

## Verify It's Working

After setting variables and redeploying:

1. **Visit your site**: https://startworking.in
2. **Check browser console** (F12) for any errors
3. **Test Gmail connection** - should work if variables are set correctly

---

## Troubleshooting

### Variables Not Working After Deploy

- **Redeploy**: Variables only apply to new deployments
- **Check scopes**: Make sure variables are set for the right environment (Production, etc.)
- **Verify values**: Double-check for typos or extra spaces

### "Supabase not configured" Error

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set
- Make sure you're using the **anon/public** key, not service_role key
- Check the values match what's in Supabase Dashboard

### "Google OAuth not configured" Error

- Verify `VITE_GOOGLE_CLIENT_ID` is set correctly
- Check for typos in the Client ID
- Make sure the variable name is exactly `VITE_GOOGLE_CLIENT_ID`

---

## Important Notes

- ✅ **VITE_GOOGLE_CLIENT_ID** - Safe to expose (public)
- ✅ **VITE_SUPABASE_URL** - Safe to expose (public)
- ✅ **VITE_SUPABASE_PUBLISHABLE_KEY** - Safe to expose (it's the public/anon key)
- ❌ **Never** put service_role key or Client Secret in Netlify (those are server-side only)

---

## Next Steps

After setting variables:
1. ✅ Redeploy your site
2. ✅ Test the application
3. ✅ Verify Gmail connection works
4. ✅ Check that all features work correctly

