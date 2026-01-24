-- Add tags column to govt_jobs table
ALTER TABLE public.govt_jobs 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for tags to allow filtering by tags if needed in future
CREATE INDEX IF NOT EXISTS idx_govt_jobs_tags ON public.govt_jobs USING GIN (tags);
