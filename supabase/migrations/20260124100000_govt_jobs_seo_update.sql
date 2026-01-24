-- Update govt_jobs table with SEO and additional fields
ALTER TABLE public.govt_jobs 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'India',
ADD COLUMN IF NOT EXISTS job_posting_json JSONB,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Index for slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_govt_jobs_slug ON public.govt_jobs(slug);

-- Function to generate slug if not present
CREATE OR REPLACE FUNCTION generate_govt_job_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.post_name || '-' || NEW.organization || '-' || floor(extract(epoch from now())), '[^a-zA-Z0-9]+', '-', 'g'));
        -- Trim trailing dashes
        NEW.slug := trim(both '-' from NEW.slug);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug on insert if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_generate_govt_job_slug') THEN
        CREATE TRIGGER trig_generate_govt_job_slug
        BEFORE INSERT ON public.govt_jobs
        FOR EACH ROW
        EXECUTE FUNCTION generate_govt_job_slug();
    END IF;
END $$;
