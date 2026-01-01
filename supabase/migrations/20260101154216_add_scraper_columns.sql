-- =====================================================
-- ADD SCRAPER CONFIG COLUMNS
-- =====================================================
-- Add missing columns to scraper_config table for auto-scraping functionality

ALTER TABLE public.scraper_config 
ADD COLUMN IF NOT EXISTS target_countries text[] DEFAULT '{"IN", "US"}',
ADD COLUMN IF NOT EXISTS search_queries text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_scrape_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_scrape_count integer DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scraper_config_platform ON public.scraper_config(platform);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_status ON public.scraping_logs(status);
CREATE INDEX IF NOT EXISTS idx_recruiters_email ON public.recruiters(email);

-- Update existing scraper_config records to have default values
UPDATE public.scraper_config 
SET 
  target_countries = COALESCE(target_countries, '{"IN", "US"}'),
  search_queries = COALESCE(search_queries, '{}'),
  auto_scrape_enabled = COALESCE(auto_scrape_enabled, false),
  last_scrape_count = COALESCE(last_scrape_count, 0)
WHERE target_countries IS NULL 
   OR search_queries IS NULL 
   OR auto_scrape_enabled IS NULL 
   OR last_scrape_count IS NULL;

