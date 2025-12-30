# Subscription Auto-Expiration System Setup

## Overview

The subscription auto-expiration system automatically downgrades users to the FREE tier when their subscription expires. It includes:

1. **Edge Function**: `check-subscription-expiry` - Processes expired subscriptions
2. **Cron Job**: Daily check at midnight UTC
3. **On-Demand Check**: Automatic check when users log in

## Components

### 1. Edge Function: `check-subscription-expiry`

**Location**: `supabase/functions/check-subscription-expiry/index.ts`

**Functionality**:
- Queries `profiles` table for users with non-FREE tier and expired `subscription_expires_at`
- Updates expired users to `subscription_tier: "FREE"` and clears `subscription_expires_at`
- Creates in-app notifications for downgraded users via `user_notifications` table
- No JWT required (runs via cron)

**Deploy**:
```bash
supabase functions deploy check-subscription-expiry
```

### 2. Cron Job Setup

**⚠️ IMPORTANT**: Supabase does **NOT** have `pg_cron` extension enabled by default. You **MUST** use an external cron service.

#### Using External Cron Service (Required)

**Recommended: cron-job.org (Free)**

1. **Go to https://cron-job.org** and sign up
2. **Create a new cron job**:
   - **Title**: `Check Subscription Expiry`
   - **URL**: `https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry`
   - **Schedule**: Daily at 00:00 UTC
   - **Method**: POST
   - **Headers**: `Content-Type: application/json`

3. **Test the endpoint**:
   ```bash
   curl -X POST https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry
   ```

**See `SETUP_CRON_JOB_EXTERNAL.md` for detailed instructions and alternative options (GitHub Actions, Vercel Cron, Netlify Scheduled Functions).**

### 3. On-Demand Check: `useAuth.tsx`

**Location**: `src/hooks/useAuth.tsx`

**Functionality**:
- Modified `fetchProfile()` to check if `subscription_expires_at < now()`
- If expired, immediately updates profile to FREE tier in database
- Creates in-app notification for the user
- Provides instant feedback without waiting for cron

**How it works**:
- Automatically runs when user logs in or profile is fetched
- Checks subscription expiry before setting profile state
- Updates database and creates notification if expired

## Testing

### Test Edge Function Manually

```bash
curl -X POST https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry
```

### Test On-Demand Check

1. Set a user's `subscription_expires_at` to a past date
2. Log in as that user
3. Check that subscription is automatically downgraded to FREE
4. Verify notification is created in `user_notifications` table

### Verify Cron Job

1. Check Supabase logs for `check-subscription-expiry` function
2. Verify it runs daily at midnight UTC
3. Check `profiles` table for updated subscription tiers
4. Check `user_notifications` table for created notifications

## Database Schema

The system uses these fields in the `profiles` table:
- `subscription_tier`: TEXT (FREE, PRO, PRO_MAX)
- `subscription_expires_at`: TIMESTAMPTZ (nullable)

The system creates notifications in the `user_notifications` table:
- `user_id`: UUID
- `title`: TEXT
- `message`: TEXT
- `type`: TEXT (default: 'warning')
- `metadata`: JSONB

## Troubleshooting

### Cron job not running
- Check if pg_cron extension is enabled
- Verify cron job is scheduled: `SELECT * FROM cron.job;`
- Check Supabase logs for errors
- Consider using external cron service as fallback

### Edge function not updating subscriptions
- Check Supabase function logs
- Verify function is deployed: `supabase functions list`
- Check database permissions for service role key

### On-demand check not working
- Verify user is logged in (has session)
- Check browser console for errors
- Verify `fetchProfile` is being called

## Configuration

The edge function is configured in `supabase/config.toml`:

```toml
[functions.check-subscription-expiry]
verify_jwt = false
```

This allows the function to be called without authentication (for cron jobs).

