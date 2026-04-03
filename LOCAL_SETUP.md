# Local Development Setup Guide

## Prerequisites
- Docker Desktop running
- Supabase CLI installed
- Node.js and npm installed

## Step 1: Start Supabase Locally

The Supabase local instance is already running. If you need to restart it:

```bash
supabase start
```

## Step 2: Create Local Environment File

Create a `.env.local` file in the project root with the following content:

```env
# Local Supabase Configuration
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# Optional: Add other environment variables for local testing
# VITE_GOOGLE_GEMINI_API_KEY=your_key_here
# VITE_FIRECRAWL_API_KEY=your_key_here
# VITE_GA_MEASUREMENT_ID=your_id_here
```

**Note:** The publishable key shown above is from your current local instance. You can get the latest one by running:
```bash
supabase status
```

## Step 3: Storage Buckets

The storage buckets (`avatars` and `resumes`) have been created automatically. You can verify them in Supabase Studio at:
http://127.0.0.1:54323

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port Vite assigns).

## Step 6: Access Supabase Studio

Open your browser and go to:
- **Supabase Studio**: http://127.0.0.1:54323
- **API URL**: http://127.0.0.1:54321
- **Database URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Useful Commands

### Government Job Scraper (UPSC CLI + Edge `scrape-govt-jobs`)

**Local Playwright (UPSC):**
```bash
# Dry run (no DB writes)
npm run scrape:upsc:dry -- --limit=3

# Actual write mode
npm run scrape:upsc -- --limit=3
```

**Edge Function (admin):** From the app → Admin → Govt. Job Postings → choose source (**All enabled** or **UPSC**) → **Run scraper**. The function uses `Authorization: Bearer <user JWT>` and writes `source_key` / `state_code` on `govt_jobs`.

Apply DB migrations so `govt_jobs` includes `source_key` and `state_code` (`supabase db push` or migration `20260323120000_govt_jobs_source_state.sql`).

Required env vars for scraper:
```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENROUTER_API_KEY=<openrouter-key>
# Optional fallback if UPSC category matching fails
DEFAULT_UPSC_MASTER_EXAM_ID=<uuid>
# Optional fallback for other source categories (e.g. SSC)
DEFAULT_MASTER_EXAM_ID=<uuid>
```

Notes:
- The CLI and Edge scraper write to `govt_jobs` using slug-based upsert.
- Exam set generation is automatically attempted for newly inserted jobs by calling `generate-exam-questions`.
- If questions already exist for a job, generation is skipped unless `--force-regenerate` (CLI) or `forceRegenerate: true` (Edge) is passed.
- **Unit tests:** `npm run test` (HTML extraction for notification content).

**Blog AI draft (`generate-blog-post`):** Set Edge Function secrets in the dashboard (or `supabase secrets set` for linked projects):

```env
OPENROUTER_API_KEY=<openrouter-key>
# Optional — at least one enables stock hero images:
PEXELS_API_KEY=<pexels-api-key>
# or
UNSPLASH_ACCESS_KEY=<unsplash-access-key>
# Optional default byline for generated posts:
BLOG_DEFAULT_AUTHOR=Startworking Editorial
```

Serve locally with `supabase functions serve generate-blog-post --env-file supabase/.env.local` (or your secrets file). From the app: **Admin → Blog Posts → Generate draft** (superadmin only).

### View Supabase Status
```bash
supabase status
```

### Stop Supabase
```bash
supabase stop
```

### Reset Database (WARNING: This will delete all data)
```bash
supabase db reset
```

### View Database Logs
```bash
supabase logs db
```

### Access Database via psql
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Testing Edge Functions Locally

To test edge functions locally, you can use:

```bash
supabase functions serve
```

Then call them at: `http://127.0.0.1:54321/functions/v1/[function-name]`

## Notes

1. **Storage Buckets**: The `avatars` and `resumes` buckets are created automatically. If you need to recreate them:
   ```sql
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('avatars', 'avatars', true), ('resumes', 'resumes', false) 
   ON CONFLICT (id) DO NOTHING;
   ```

2. **RLS Policies**: All Row Level Security policies are applied automatically through migrations.

3. **Local Data**: Data is stored in Docker volumes. To completely reset:
   ```bash
   supabase stop --no-backup
   docker volume rm supabase_db_ypmyzbtgossmizklszek
   supabase start
   ```

4. **Email Testing**: Use Mailpit at http://127.0.0.1:54324 to view all emails sent by the application.

## Troubleshooting

### Port Already in Use
If ports are already in use, you can change them in `supabase/config.toml`.

### Storage Not Working
Make sure the storage buckets exist:
```sql
SELECT * FROM storage.buckets;
```

### Migrations Not Applied
Reset the database:
```bash
supabase db reset
```

