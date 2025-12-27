# Razorpay Setup Instructions

## Step 1: Get Razorpay Credentials

1. Go to https://razorpay.com and sign up/login
2. Navigate to Settings → API Keys
3. Generate API keys (Key ID and Key Secret)
4. Copy both values

## Step 2: Set Secrets in Supabase

Run these commands (replace with your actual keys):

```bash
supabase secrets set RAZORPAY_KEY_ID=your_razorpay_key_id_here
supabase secrets set RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

## Step 3: Redeploy Edge Functions

```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

## Step 4: Test Payment

Try purchasing a plan again. The payment should work now.

## Note

- Use test keys for development
- Use live keys for production
- Make sure webhook URLs are configured in Razorpay dashboard if needed
