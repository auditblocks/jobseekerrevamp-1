-- Create govt_jobs table
CREATE TABLE IF NOT EXISTS public.govt_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization TEXT NOT NULL,
    post_name TEXT NOT NULL,
    exam_name TEXT,
    advertisement_no TEXT,
    official_website TEXT,
    apply_url TEXT,
    application_start_date TIMESTAMPTZ,
    application_end_date TIMESTAMPTZ,
    application_fee TEXT,
    mode_of_apply TEXT DEFAULT 'Online',
    description TEXT,
    visibility TEXT DEFAULT 'free' CHECK (visibility IN ('free', 'premium')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create job_tracker table
CREATE TABLE IF NOT EXISTS public.job_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.govt_jobs(id) ON DELETE SET NULL,
    organization TEXT NOT NULL,
    post_name TEXT NOT NULL,
    exam_name TEXT,
    advertisement_no TEXT,
    official_website TEXT,
    application_start_date TIMESTAMPTZ,
    application_end_date TIMESTAMPTZ,
    application_fee TEXT,
    mode_of_apply TEXT,
    application_status TEXT DEFAULT 'Not Applied',
    payment_status TEXT DEFAULT 'Pending',
    admit_card_status TEXT DEFAULT 'Not Available',
    exam_date TIMESTAMPTZ,
    result_status TEXT DEFAULT 'Awaiting',
    interview_date TIMESTAMPTZ,
    final_status TEXT DEFAULT 'Pending',
    documents_required TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.govt_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tracker ENABLE ROW LEVEL SECURITY;

-- Govt Jobs Policies
-- Anyone can view active govt jobs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'govt_jobs' AND policyname = 'Anyone can view govt_jobs'
    ) THEN
        CREATE POLICY "Anyone can view govt_jobs" 
        ON public.govt_jobs FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Only admins can manage govt jobs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') AND NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'govt_jobs' AND policyname = 'Admins can manage govt_jobs'
    ) THEN
        EXECUTE 'CREATE POLICY "Admins can manage govt_jobs" ON public.govt_jobs FOR ALL USING (public.is_superadmin())';
    END IF;
END $$;

-- Job Tracker Policies
-- Users can only see/manage their own tracker
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'job_tracker' AND policyname = 'Users can manage their own tracker'
    ) THEN
        CREATE POLICY "Users can manage their own tracker" 
        ON public.job_tracker FOR ALL 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add updated_at trigger for both tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_govt_jobs_updated_at BEFORE UPDATE ON public.govt_jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_job_tracker_updated_at BEFORE UPDATE ON public.job_tracker FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.govt_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_tracker;
