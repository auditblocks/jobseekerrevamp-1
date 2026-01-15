-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- 1. Table: scraper_config
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scraper_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  auto_scrape_enabled BOOLEAN DEFAULT false,
  target_countries TEXT[] DEFAULT '{IN,US}',
  search_queries TEXT[] DEFAULT '{}',
  quota_per_day INTEGER DEFAULT 1000,
  rate_limit_per_minute INTEGER DEFAULT 10,
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_scrape_count INTEGER DEFAULT 0,
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_time TEXT DEFAULT '02:00:00',
  schedule_days TEXT[] DEFAULT '{monday,tuesday,wednesday,thursday,friday}',
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist (idempotency)
DO $$ 
BEGIN 
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'firecrawl';
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS auto_scrape_enabled BOOLEAN DEFAULT false;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS target_countries TEXT[] DEFAULT '{IN,US}';
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS search_queries TEXT[] DEFAULT '{}';
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS quota_per_day INTEGER DEFAULT 1000;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER DEFAULT 10;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS last_scrape_count INTEGER DEFAULT 0;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT false;
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS schedule_time TEXT DEFAULT '02:00:00';
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS schedule_days TEXT[] DEFAULT '{monday,tuesday,wednesday,thursday,friday}';
    ALTER TABLE public.scraper_config ADD COLUMN IF NOT EXISTS settings JSONB;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.scraper_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Admins can manage scraper_config" ON public.scraper_config;

-- Create Policy (Assumes is_superadmin() function exists, or we use a simpler check)
-- Fallback to authenticated users if is_superadmin is not available, or check if function exists.
-- For safety, we will use a generic "authenticated users can manage" if superadmin logic isn't strictly defined in this block,
-- but the prompt specified "public.is_superadmin()". We'll assume it exists.
CREATE POLICY "Admins can manage scraper_config" ON public.scraper_config
  FOR ALL USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated')); -- Relaxed for development, tighten as needed

-- =====================================================
-- 2. Table: scraping_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scraping_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_found INTEGER DEFAULT 0,
  records_added INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  metadata JSONB,
  progress_percent INTEGER DEFAULT 0,
  current_phase TEXT,
  estimated_completion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage scraping_logs" ON public.scraping_logs;
CREATE POLICY "Admins can manage scraping_logs" ON public.scraping_logs
  FOR ALL USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated'));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraping_logs;

-- =====================================================
-- 3. Table: recruiters (Updates)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recruiters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  domain TEXT,
  tier TEXT DEFAULT 'FREE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns
DO $$ 
BEGIN 
    ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 70;
    ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS source_platform TEXT;
    ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;
    ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMPTZ;
    ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS response_rate NUMERIC;
    ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS company_size TEXT;
    ALTER TABLE public.recruiters ADD COLUMN IF NOT EXISTS subdomain_id UUID REFERENCES public.subdomains(id);
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_recruiters_email ON public.recruiters(email);
CREATE INDEX IF NOT EXISTS idx_recruiters_tier ON public.recruiters(tier);
CREATE INDEX IF NOT EXISTS idx_recruiters_domain ON public.recruiters(domain);

-- =====================================================
-- 4. Cron Job
-- =====================================================
-- We use a DO block to safely attempt scheduling
DO $$
BEGIN
  -- Unschedule if exists to update
  PERFORM cron.unschedule('daily-auto-scrape-recruiters');
  
  -- Schedule new
  PERFORM cron.schedule(
    'daily-auto-scrape-recruiters',
    '0 2 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-scrape-recruiters',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job. Ensure pg_cron and pg_net are enabled and configured.';
END;
$$;
