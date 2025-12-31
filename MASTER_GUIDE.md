# JobSeeker - Master Setup & Configuration Guide

This is the complete master guide for setting up, configuring, and troubleshooting the JobSeeker application.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Google OAuth Setup](#google-oauth-setup)
3. [Gmail Integration & Webhooks](#gmail-integration--webhooks)
4. [Subscription Management](#subscription-management)
5. [Bulk Recruiter Import](#bulk-recruiter-import)
6. [Domain Configuration](#domain-configuration)
7. [Edge Functions](#edge-functions)
8. [Database Setup](#database-setup)
9. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Tech Stack:**
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- Backend: Supabase (PostgreSQL, Edge Functions, Auth, Storage)
- Email: Gmail API, Resend API
- Payment: Razorpay
- Deployment: Netlify

**Project Structure:**
- `src/` - Frontend React application
- `supabase/functions/` - Edge functions (Deno)
- `supabase/migrations/` - Database migrations
- `public/` - Static assets

---

## Google OAuth Setup

### Credentials Configuration

**Client ID & Secret Location:**
- Supabase Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Frontend `.env`: `VITE_GOOGLE_CLIENT_ID`
- Netlify Environment Variables: `VITE_GOOGLE_CLIENT_ID`

### Setup Steps

1. **Create OAuth Client in Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://startworking.in/compose`
     - `http://localhost:5173/compose`
     - `https://startworking.netlify.app/compose`

2. **Configure Supabase Secrets**
   - Supabase Dashboard → Settings → Edge Functions → Secrets
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

3. **Configure Frontend**
   - Create `.env` file with `VITE_GOOGLE_CLIENT_ID=your-client-id`
   - Add to Netlify environment variables

4. **OAuth Consent Screen**
   - Configure app name, logo, privacy policy, terms of service
   - Add scopes: `gmail.send`, `gmail.readonly`
   - Submit for verification (if using sensitive scopes)

### Verification Issues

**Branding Verification:**
- Verify domain ownership via Google Search Console
- Upload verification HTML file to `public/` directory
- Ensure app name matches website branding

**CASA Security Assessment:**
- Access via: Google Cloud Console → APIs & Services → OAuth consent screen → Security
- Complete security assessment if required

---

## Gmail Integration & Webhooks

### Gmail Push Notifications (Advanced)

**Setup:**
1. Enable Gmail API and Cloud Pub/Sub API in Google Cloud Console
2. Create Pub/Sub topic: `gmail-notifications`
3. Create subscription with push endpoint: `https://your-project.supabase.co/functions/v1/gmail-webhook`
4. Create service account with Pub/Sub Subscriber role
5. Store service account JSON in Supabase secrets as `GOOGLE_CLOUD_SERVICE_ACCOUNT`
6. Enable Gmail Watch API for user's mailbox

**Edge Function:** `gmail-webhook`
- Receives push notifications from Pub/Sub
- Processes incoming emails
- Creates conversation messages

### Gmail Polling (Simpler Alternative)

**Setup:**
1. Use external cron service (cron-job.org, GitHub Actions, etc.)
2. Schedule to call: `https://your-project.supabase.co/functions/v1/check-gmail-replies`
3. Frequency: Every 10-15 minutes

**Edge Function:** `check-gmail-replies`
- Polls Gmail API for unread messages
- Processes replies to existing conversation threads
- Creates conversation messages

### Troubleshooting Gmail Replies

**"Failed to refresh token":**
- User needs to reconnect Gmail account
- Old refresh token incompatible with new OAuth credentials
- Solution: Disconnect and reconnect Gmail in app

**Replies not appearing:**
- Check edge function logs in Supabase Dashboard
- Verify Gmail Watch is active (expires after 7 days)
- Ensure `check-gmail-replies` cron job is running

---

## Subscription Management

### Auto-Expiration System

**Components:**
- Edge Function: `check-subscription-expiry`
- External Cron Job (required - Supabase doesn't have pg_cron by default)
- On-demand check in `useAuth.tsx` on user login

**Setup External Cron:**
1. Use cron-job.org (free) or GitHub Actions
2. Schedule: Daily at 00:00 UTC
3. URL: `https://your-project.supabase.co/functions/v1/check-subscription-expiry`
4. Method: POST

**Functionality:**
- Queries users with expired subscriptions
- Downgrades to FREE tier
- Creates in-app notifications

---

## Bulk Recruiter Import

### Setup

**Edge Function:** `bulk-import-recruiters`
- Requires admin authentication
- Accepts Google Sheets URL
- Parses CSV export
- Validates and imports recruiters

**Google Sheets Format:**
- Required: `name`, `email`
- Optional: `company`, `domain`, `tier`, `quality_score`
- Skips blank/invalid rows automatically

**Usage:**
1. Admin → Recruiters → Bulk Import
2. Paste Google Sheets URL (must be publicly accessible or shared)
3. Toggle "Skip duplicates" if needed
4. Click Import

**Limitations:**
- Google Sheets CSV export limited to ~1000 rows
- For larger imports, split into multiple sheets

---

## Domain Configuration

### Netlify Domain Setup

**DNS Configuration:**
1. In Hostinger DNS:
   - Remove conflicting A records
   - Add Netlify A record: `216.198.79.1` (or use CNAME)
   - Update nameservers to Netlify's

2. In Netlify:
   - Site settings → Domain management
   - Add custom domain
   - Follow DNS configuration instructions

**Common Issues:**
- **Domain showing parking page**: Disable "Domain Parking" in Hostinger
- **Invalid configuration**: Remove conflicting DNS records
- **Page not found on direct routes**: Ensure `public/_redirects` exists with `/* /index.html 200`

---

## Edge Functions

### Required Secrets

Configure in Supabase Dashboard → Settings → Edge Functions → Secrets:

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay API secret
- `RESEND_API_KEY` - Resend API key (required for email campaigns and Resend email sending)
  - **Value**: `re_gRSNr18j_AeJaWoRysvGLLhZxX9x4y5Qc`
  - **Setup**: Add in Supabase Dashboard → Settings → Edge Functions → Secrets
- `LOVABLE_API_KEY` - AI API key (for email generation)

### Function List

- `send-email-gmail` - Send emails via Gmail API
- `send-email-resend` - Send emails via Resend (fallback)
- `send-email-campaign` - Send email campaigns to multiple users via Resend (admin only)
- `track-email-click` - Track email link clicks for campaigns
- `gmail-oauth-callback` - Handle Gmail OAuth callback
- `gmail-webhook` - Receive Gmail push notifications
- `check-gmail-replies` - Poll Gmail for replies
- `check-subscription-expiry` - Auto-expire subscriptions
- `bulk-import-recruiters` - Bulk import from Google Sheets
- `generate-email-ai` - AI email generation
- `create-razorpay-order` - Create payment orders
- `verify-razorpay-payment` - Verify payments
- `track-email-open` - Email tracking pixel
- `get-google-client-id` - Get OAuth client ID

**See `EDGE_FUNCTIONS_EXPORT.md` for complete function code.**

---

## Resend API Setup

### API Key Configuration

**Resend API Key:**
- **Key**: `re_gRSNr18j_AeJaWoRysvGLLhZxX9x4y5Qc`
- **Location**: Supabase Dashboard → Settings → Edge Functions → Secrets
- **Secret Name**: `RESEND_API_KEY`

### Setup Steps

1. **Add to Supabase Secrets:**
   - Go to Supabase Dashboard → Settings → Edge Functions → Secrets
   - Click "Add Secret"
   - Name: `RESEND_API_KEY`
   - Value: `re_gRSNr18j_AeJaWoRysvGLLhZxX9x4y5Qc`
   - Click "Save"

2. **Redeploy Edge Functions:**
   ```bash
   supabase functions deploy send-email-resend
   supabase functions deploy send-email-campaign
   ```

3. **Verify Setup:**
   - Test sending an email campaign from admin portal
   - Check edge function logs for any errors

### Functions Using Resend

- `send-email-resend` - Individual email sending
- `send-email-campaign` - Bulk email campaigns (admin only)

### Storage Bucket Setup

For email campaign attachments:

1. Go to Supabase Dashboard → Storage
2. Create bucket: `email-campaign-attachments`
3. Set to public or configure RLS policies
4. Bucket is used for storing campaign attachment files

---

## Database Setup

### Initial Setup

1. **Run migrations:**
   ```bash
   supabase db reset
   # or apply migrations individually
   ```

2. **Create admin user:**
   - See `DATABASE_BACKUP.sql` for admin creation script
   - Or use Supabase SQL Editor

3. **Configure RLS policies:**
   - See `RLS_POLICIES.sql` for all policies
   - Policies are automatically applied via migrations

### Key Tables

- `profiles` - User profiles and subscription data
- `recruiters` - Recruiter database
- `conversation_threads` - Email conversation threads
- `conversation_messages` - Individual messages
- `email_tracking` - Email open/click tracking
- `subscription_plans` - Available subscription tiers
- `user_notifications` - In-app notifications

---

## Troubleshooting

### OAuth Issues

**"redirect_uri_mismatch":**
- Ensure redirect URI in Google Console matches exactly
- Check for trailing slashes, protocol (http vs https)

**"Failed to refresh token":**
- User must reconnect Gmail account
- Old token incompatible with new OAuth credentials

### Email Issues

**Emails not sending:**
- Check Gmail is connected in user profile
- Verify daily email limits not exceeded
- Check edge function logs for errors

**Replies not appearing:**
- Verify `check-gmail-replies` cron is running
- Check edge function logs
- Ensure Gmail Watch is active (renews every 7 days)

### Domain Issues

**Domain not resolving:**
- Check DNS records in Hostinger
- Verify nameservers point to Netlify
- Disable domain parking in Hostinger

**404 on direct routes:**
- Ensure `public/_redirects` exists
- Check `netlify.toml` configuration

### Database Issues

**Permission denied:**
- Check RLS policies are enabled
- Verify user has correct role in `user_roles` table
- Check `is_superadmin()` function works

---

## Quick Reference

### Important URLs

- Production: https://startworking.in
- Supabase Dashboard: https://supabase.com/dashboard
- Google Cloud Console: https://console.cloud.google.com/
- Netlify Dashboard: https://app.netlify.com/

### Key Commands

```bash
# Deploy edge functions
supabase functions deploy <function-name>

# Check secrets
supabase secrets list

# Run migrations
supabase db reset

# Local development
npm run dev
```

---

## Support

For issues or questions:
1. Check edge function logs in Supabase Dashboard
2. Check browser console for frontend errors
3. Review this guide's troubleshooting section
4. Check Supabase logs for database errors

---

**Last Updated:** 2025-01-01
**Version:** 1.0

