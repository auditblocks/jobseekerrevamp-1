# Netlify Environment Variables - Step by Step

## Quick Setup via Netlify Dashboard

### Step 1: Get Your Supabase Anon Key

1. Go to: **https://supabase.com/dashboard/project/ypmyzbtgossmizklszek/settings/api**
2. Find **"anon public"** key (the public one, NOT service_role)
3. **Copy it** - you'll need it in Step 3

### Step 2: Go to Netlify Dashboard

1. Visit: **https://app.netlify.com/**
2. Click on your site: **startworking** (or find your site)
3. Click **"Site settings"** (gear icon ⚙️ in the top navigation)

### Step 3: Add Environment Variables

1. In the left sidebar, click **"Environment variables"**
2. Click the **"Add a variable"** button

#### Add Variable 1: VITE_GOOGLE_CLIENT_ID

- **Key**: `VITE_GOOGLE_CLIENT_ID`
- **Value**: `278703971912-233fdcgfpitjd7v3i7713srolgg6cv9v.apps.googleusercontent.com`
- **Scopes**: Check all boxes:
  - ✅ Production
  - ✅ Deploy previews  
  - ✅ Branch deploys
- Click **"Save"**

#### Add Variable 2: VITE_SUPABASE_URL

- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://ypmyzbtgossmizklszek.supabase.co`
- **Scopes**: Check all boxes:
  - ✅ Production
  - ✅ Deploy previews
  - ✅ Branch deploys
- Click **"Save"**

#### Add Variable 3: VITE_SUPABASE_PUBLISHABLE_KEY

- **Key**: `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Value**: (Paste the anon/public key you copied from Step 1)
- **Scopes**: Check all boxes:
  - ✅ Production
  - ✅ Deploy previews
  - ✅ Branch deploys
- Click **"Save"**

### Step 4: Redeploy Your Site

After adding all variables, you need to trigger a new deployment:

1. Go to the **"Deploys"** tab (top navigation)
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for the deployment to complete

---

## Verify Variables Are Set

After redeploying, check:

1. Go back to **Site settings** → **Environment variables**
2. You should see all 3 variables listed:
   - ✅ VITE_GOOGLE_CLIENT_ID
   - ✅ VITE_SUPABASE_URL
   - ✅ VITE_SUPABASE_PUBLISHABLE_KEY

---

## Test Your Site

1. Visit: **https://startworking.in**
2. The app should load without errors
3. Try connecting Gmail - it should work now

---

## Summary of Values

Copy these values to Netlify:

```
VITE_GOOGLE_CLIENT_ID = 278703971912-233fdcgfpitjd7v3i7713srolgg6cv9v.apps.googleusercontent.com
VITE_SUPABASE_URL = https://ypmyzbtgossmizklszek.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = (get from Supabase Dashboard)
```

---

## Important Notes

- ⚠️ **Redeploy required**: Variables only apply to NEW deployments
- ✅ **All scopes**: Set variables for Production, Deploy previews, and Branch deploys
- ✅ **Anon key only**: Use the **anon/public** key, NOT service_role key
- ✅ **No secrets**: These are all public keys (safe to expose)

---

That's it! Your Netlify site will now have all the required environment variables. 🎉

