# Razorpay Credentials Update Guide

## 🔑 Your New Credentials

```
Key ID:     rzp_live_S21aI77comfst0
Key Secret: V33rtOot5Biw5jGNVJoLTwNT
```

⚠️ **IMPORTANT:** These are **LIVE** credentials (not test). Only use these in production!

## ✅ Where to Update Razorpay Credentials

### 1. **Supabase Secrets** ✅ (You've done this)

The Supabase Edge Functions use these environment variables:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

**Where they're used:**
- `supabase/functions/create-razorpay-order/index.ts` (lines 22-23)
- `supabase/functions/verify-razorpay-payment/index.ts` (line 42)
- `supabase/functions/create-ats-scan-order/index.ts`
- `supabase/functions/verify-ats-payment/index.ts`

**How to update in Supabase:**
```bash
# Using Supabase CLI
supabase secrets set RAZORPAY_KEY_ID=rzp_live_S21aI77comfst0
supabase secrets set RAZORPAY_KEY_SECRET=V33rtOot5Biw5jGNVJoLTwNT

# Or via Supabase Dashboard:
# 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
# 2. Click "Manage secrets"
# 3. Update both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
```

### 2. **Netlify Environment Variables** ✅ (You've done this)

Although your frontend doesn't directly use the secret key (only the key_id is exposed to frontend), it's good practice to have them in Netlify for any build-time needs.

**How to verify in Netlify:**
```
1. Go to: https://app.netlify.com/sites/YOUR_SITE/settings/deploys
2. Click "Environment variables"
3. Verify:
   - VITE_RAZORPAY_KEY_ID = rzp_live_S21aI77comfst0
   - (RAZORPAY_KEY_SECRET should NOT be exposed to frontend)
```

### 3. **Local Development** (Optional - for testing)

If you have a local `.env` file (not committed to git):

**.env.local** (create if it doesn't exist):
```bash
# Razorpay Credentials - LIVE MODE
VITE_RAZORPAY_KEY_ID=rzp_live_S21aI77comfst0

# Don't put secret in frontend .env - it's only used in Supabase Edge Functions
```

⚠️ **Never commit** `.env` files with real credentials to GitHub!

### 4. **Frontend Code** (No changes needed)

The frontend code in `src/pages/Subscription.tsx` receives the key_id from the backend:
```typescript
// Line 141 - The key_id comes from the backend response
const options = {
  key: orderData.key_id,  // ← This comes from Supabase Edge Function
  // ...
};
```

✅ **No changes needed** - the key is fetched dynamically from your edge function.

## 🔍 Verification Checklist

After updating credentials, verify:

### ✅ 1. Supabase Secrets Updated
```bash
# List secrets (won't show values for security)
supabase secrets list

# Should show:
# - RAZORPAY_KEY_ID
# - RAZORPAY_KEY_SECRET
```

### ✅ 2. Edge Functions Deployed
```bash
# Redeploy edge functions to pick up new secrets
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy create-ats-scan-order
supabase functions deploy verify-ats-payment
```

**Or via Supabase Dashboard:**
1. Go to Edge Functions
2. Each function should show "Active" status
3. Test by making a payment

### ✅ 3. Test Payment Flow
1. Go to your app: `/subscription`
2. Click upgrade on any plan
3. **Use LIVE card** (since you're using live keys now!)
4. Complete payment
5. Verify:
   - Payment succeeds
   - Redirects to dashboard
   - Subscription tier updates
   - Payment appears in Razorpay dashboard

⚠️ **IMPORTANT:** With live keys, real money will be charged!

### ✅ 4. Check Razorpay Dashboard
1. Go to: https://dashboard.razorpay.com/
2. Verify you're in **Live Mode** (toggle at top)
3. Check that test payment appears
4. Verify webhook settings (if applicable)

## 🎯 Summary - What You've Done

| Location | Variable | Status |
|----------|----------|--------|
| Supabase Secrets | `RAZORPAY_KEY_ID` | ✅ Updated |
| Supabase Secrets | `RAZORPAY_KEY_SECRET` | ✅ Updated |
| Netlify | Environment Vars | ✅ Updated |
| Frontend Code | - | ✅ No change needed |
| Local .env | (Optional) | ⚠️ Optional |

## 🚨 Important Notes

### Test vs Live Mode

**You're now using LIVE credentials** (`rzp_live_*`):
- ✅ Real payments will be processed
- ✅ Real money will be charged
- ✅ Bank transfers will happen
- ⚠️ Test cards **will NOT work**

**If you want to test first:**
Use test credentials instead:
```
Test Key ID:     rzp_test_XXXXXXXXXX
Test Key Secret: XXXXXXXXXXXXXXXXXX
```

### Security Best Practices

1. ✅ **Never commit** credentials to GitHub
2. ✅ **Never expose** `RAZORPAY_KEY_SECRET` to frontend
3. ✅ **Always use** environment variables/secrets
4. ✅ **Rotate keys** periodically for security
5. ✅ **Monitor** Razorpay dashboard for suspicious activity

### What Each Key Does

**`RAZORPAY_KEY_ID`** (`rzp_live_S21aI77comfst0`):
- ✅ Safe to expose to frontend
- Used in Razorpay checkout modal
- Identifies your Razorpay account
- Used in: Frontend payment modal

**`RAZORPAY_KEY_SECRET`** (`V33rtOot5Biw5jGNVJoLTwNT`):
- ❌ **NEVER expose** to frontend
- Used only in backend (Supabase Edge Functions)
- Used to create orders and verify signatures
- Used in: Edge functions only

## 🔄 Deployment Steps

After updating credentials:

1. **Supabase Edge Functions:**
   ```bash
   # Functions automatically pick up new secrets
   # No redeploy needed, but you can force it:
   supabase functions deploy --no-verify-jwt
   ```

2. **Netlify (Frontend):**
   - Automatically redeploys on next push
   - Or trigger manual deploy in Netlify dashboard

3. **Verify:**
   - Test payment flow
   - Check Razorpay dashboard
   - Monitor for errors

## 🐛 Troubleshooting

### "Payment gateway not configured" Error

**Cause:** Edge function can't find Razorpay credentials

**Fix:**
```bash
# Re-set Supabase secrets
supabase secrets set RAZORPAY_KEY_ID=rzp_live_S21aI77comfst0
supabase secrets set RAZORPAY_KEY_SECRET=V33rtOot5Biw5jGNVJoLTwNT

# Redeploy functions
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

### "Invalid key" Error

**Cause:** Wrong key ID or secret

**Fix:**
1. Verify keys in Razorpay dashboard
2. Ensure no extra spaces in keys
3. Check you're using correct mode (test vs live)

### Payment Fails with "Invalid signature"

**Cause:** `RAZORPAY_KEY_SECRET` mismatch

**Fix:**
1. Verify secret in Supabase matches Razorpay dashboard
2. Redeploy `verify-razorpay-payment` function

## 📞 Need Help?

1. **Check Supabase Logs:**
   - Go to: Supabase Dashboard → Edge Functions → Logs
   - Look for errors in `create-razorpay-order` and `verify-razorpay-payment`

2. **Check Browser Console:**
   - Look for actual errors (not Razorpay tracking errors)
   - Check network tab for failed API calls

3. **Check Razorpay Dashboard:**
   - Verify credentials are active
   - Check for API errors or alerts

## ✅ You're All Set!

You've updated Razorpay credentials in:
- ✅ Supabase Secrets
- ✅ Netlify Environment Variables

No other changes needed! Your payment flow will now use the new credentials.

**Next step:** Test a payment to verify everything works! 🎉
