-- Contact form submissions (inserted only via send-contact-form edge function using service role)

CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('home', 'contact_page', 'settings')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions (status);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- No INSERT/SELECT for anonymous or regular users; service role bypasses RLS

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') AND NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'contact_submissions' AND policyname = 'Superadmins can view contact submissions'
    ) THEN
        CREATE POLICY "Superadmins can view contact submissions"
        ON public.contact_submissions FOR SELECT
        TO authenticated
        USING (public.is_superadmin());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') AND NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'contact_submissions' AND policyname = 'Superadmins can update contact submissions'
    ) THEN
        CREATE POLICY "Superadmins can update contact submissions"
        ON public.contact_submissions FOR UPDATE
        TO authenticated
        USING (public.is_superadmin())
        WITH CHECK (public.is_superadmin());
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_contact_submissions_updated_at ON public.contact_submissions;
CREATE TRIGGER update_contact_submissions_updated_at
    BEFORE UPDATE ON public.contact_submissions
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
