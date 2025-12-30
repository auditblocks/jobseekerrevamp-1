# Setup Subscription Expiry Cron Job (External Service)

## Why External Cron?

Supabase does **not** have `pg_cron` extension enabled by default. Therefore, we need to use an external cron service to call the subscription expiry edge function daily.

## Option 1: cron-job.org (Recommended - Free)

### Step 1: Create Account
1. Go to https://cron-job.org
2. Sign up for a free account

### Step 2: Create Cron Job
1. Click **"Create cronjob"**
2. Fill in the details:
   - **Title**: `Check Subscription Expiry`
   - **Address**: `https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry`
   - **Request method**: `POST`
   - **Schedule**: `Daily at 00:00 UTC` (or select "Every day" and set time to 00:00)
   - **Request headers**: 
     ```
     Content-Type: application/json
     ```
3. Click **"Create cronjob"**

### Step 3: Test
1. Click **"Run now"** to test the cron job
2. Check Supabase logs to verify the function executed successfully
3. Verify in your database that expired subscriptions were updated

## Option 2: GitHub Actions (Free for Public Repos)

### Step 1: Create Workflow File

Create `.github/workflows/check-subscription-expiry.yml`:

```yaml
name: Check Subscription Expiry

on:
  schedule:
    # Run daily at midnight UTC
    - cron: '0 0 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  check-expiry:
    runs-on: ubuntu-latest
    steps:
      - name: Call Subscription Expiry Function
        run: |
          curl -X POST \
            https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry \
            -H "Content-Type: application/json"
```

### Step 2: Commit and Push
```bash
git add .github/workflows/check-subscription-expiry.yml
git commit -m "Add subscription expiry cron job"
git push
```

## Option 3: Vercel Cron (If Using Vercel)

If you're deploying to Vercel, you can use Vercel Cron:

### Step 1: Create `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/check-subscription-expiry",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Step 2: Create API Route

Create `api/cron/check-subscription-expiry.ts`:

```typescript
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      'https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
```

## Option 4: Netlify Scheduled Functions (If Using Netlify)

### Step 1: Create Scheduled Function

Create `netlify/functions/check-subscription-expiry.ts`:

```typescript
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    const response = await fetch(
      'https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### Step 2: Configure in `netlify.toml`

```toml
[functions]
  directory = "netlify/functions"

[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[[schedules]]
  cron = "0 0 * * *"  # Daily at midnight UTC
  function = "check-subscription-expiry"
```

## Testing the Cron Job

### Manual Test

Test the edge function directly:

```bash
curl -X POST https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry
```

### Expected Response

```json
{
  "message": "No expired subscriptions found",
  "count": 0
}
```

Or if there are expired subscriptions:

```json
{
  "message": "Successfully processed 5 expired subscriptions",
  "count": 5,
  "users": [
    {
      "id": "...",
      "email": "user@example.com",
      "previous_tier": "PRO"
    }
  ]
}
```

## Verification

After setting up the cron job:

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Edge Functions → `check-subscription-expiry` → Logs
   - Verify the function is being called daily

2. **Check Database**:
   - Query `profiles` table for users with `subscription_tier != 'FREE'` and `subscription_expires_at < NOW()`
   - Should be empty (all expired subscriptions should be updated)

3. **Check Notifications**:
   - Query `user_notifications` table
   - Should see notifications created for downgraded users

## Troubleshooting

### Cron job not running
- Verify the URL is correct
- Check cron service logs
- Verify the schedule is set correctly (UTC timezone)

### Function returns error
- Check Supabase function logs
- Verify function is deployed: `supabase functions list`
- Test function manually with curl

### No subscriptions updated
- Check if there are actually expired subscriptions in the database
- Verify `subscription_expires_at` is set correctly
- Check function logs for errors

## Recommended Setup

For most users, **cron-job.org** is the easiest and most reliable option:
- ✅ Free tier available
- ✅ Easy to set up
- ✅ Reliable execution
- ✅ Email notifications on failures
- ✅ Manual trigger option for testing

