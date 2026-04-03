-- Naukri / Apify private jobs (isolated from govt_jobs)
-- Secrets: superadmin-only RLS (never use system_settings for API tokens — authenticated users can read all rows there)

CREATE TABLE IF NOT EXISTS public.admin_integration_secrets (
    secret_key TEXT PRIMARY KEY,
    secret_value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.admin_integration_secrets IS 'Superadmin-only integration secrets (e.g. Apify token). Not readable by regular users.';

CREATE TABLE IF NOT EXISTS public.naukri_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_name TEXT,
    location TEXT,
    apply_url TEXT NOT NULL,
    external_key TEXT NOT NULL,
    posted_at TIMESTAMPTZ,
    summary TEXT,
    salary_text TEXT,
    experience_text TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    source TEXT NOT NULL DEFAULT 'naukri',
    raw_item JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT naukri_jobs_apply_url_unique UNIQUE (apply_url),
    CONSTRAINT naukri_jobs_external_key_unique UNIQUE (external_key)
);

CREATE INDEX IF NOT EXISTS idx_naukri_jobs_active_scraped ON public.naukri_jobs (is_active, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_naukri_jobs_company ON public.naukri_jobs (company_name);

CREATE TABLE IF NOT EXISTS public.naukri_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
    items_upserted INTEGER DEFAULT 0,
    items_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    apify_run_id TEXT,
    dataset_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_naukri_sync_log_started ON public.naukri_sync_log (started_at DESC);

ALTER TABLE public.admin_integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naukri_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naukri_sync_log ENABLE ROW LEVEL SECURITY;

-- naukri_jobs: anyone can read active rows (anon + authenticated) for listing page
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'naukri_jobs' AND policyname = 'Anyone can view active naukri_jobs'
    ) THEN
        CREATE POLICY "Anyone can view active naukri_jobs"
        ON public.naukri_jobs FOR SELECT
        USING (is_active = true);
    END IF;
END $$;

-- admin_integration_secrets: superadmin only
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') AND NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'admin_integration_secrets' AND policyname = 'Superadmins manage integration secrets'
    ) THEN
        EXECUTE $p$
        CREATE POLICY "Superadmins manage integration secrets"
        ON public.admin_integration_secrets FOR ALL
        USING (public.is_superadmin())
        WITH CHECK (public.is_superadmin())
        $p$;
    END IF;
END $$;

-- naukri_sync_log: superadmin read only (inserts via service role)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') AND NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'naukri_sync_log' AND policyname = 'Superadmins read naukri_sync_log'
    ) THEN
        EXECUTE $p$
        CREATE POLICY "Superadmins read naukri_sync_log"
        ON public.naukri_sync_log FOR SELECT
        USING (public.is_superadmin())
        $p$;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_naukri_jobs_updated_at') THEN
        CREATE TRIGGER update_naukri_jobs_updated_at
        BEFORE UPDATE ON public.naukri_jobs
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
