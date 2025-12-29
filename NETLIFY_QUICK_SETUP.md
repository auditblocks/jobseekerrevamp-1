# Quick Netlify Environment Variables Setup

## Required Variables

Set these 3 environment variables in Netlify:

1. `VITE_GOOGLE_CLIENT_ID` = `278703971912-233fdcgfpitjd7v3i7713srolgg6cv9v.apps.googleusercontent.com`
2. `VITE_SUPABASE_URL` = `https://ypmyzbtgossmizklszek.supabase.co`
3. `VITE_SUPABASE_PUBLISHABLE_KEY` = (Get from Supabase Dashboard → Settings → API → anon/public key)

---

## Quick Steps (Dashboard Method)

### 1. Go to Netlify Dashboard
- Visit: https://app.netlify.com/
- Select your site: **startworking** (or your site name)

### 2. Navigate to Environment Variables
- Click **Site settings** (gear icon)
- Click **Environment variables** in the left sidebar

### 3. Add Each Variable

Click **"Add a variable"** for each:

**Variable 1:**
- Key: `VITE_GOOGLE_CLIENT_ID`
- Value: `278703971912-233fdcgfpitjd7v3i7713srolgg6cv9v.apps.googleusercontent.com`
- Scopes: ✅ All scopes
- Click **Save**

**Variable 2:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://ypmyzbtgossmizklszek.supabase.co`
- Scopes: ✅ All scopes
- Click **Save**

**Variable 3:**
- Key: `VITE_SUPABASE_PUBLISHABLE_KEY`
- Value: (Get from Supabase Dashboard → Settings → API → **anon/public** key)
- Scopes: ✅ All scopes
- Click **Save**

### 4. Redeploy
- Go to **Deploys** tab
- Click **"Trigger deploy"** → **"Deploy site"**

---

## Get Supabase Anon Key

1. Go to: https://supabase.com/dashboard/project/ypmyzbtgossmizklszek/settings/api
2. Find **"anon public"** key (NOT service_role)
3. Copy it
4. Paste it as `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify

---

## Verify

After redeploy, visit https://startworking.in and test:
- ✅ App loads without errors
- ✅ Gmail connection works
- ✅ All features function correctly

Done! 🎉

