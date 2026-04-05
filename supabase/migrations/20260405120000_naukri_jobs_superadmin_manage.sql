-- Allow superadmins to list and manage all naukri_jobs (including inactive rows).
-- Public policy "Anyone can view active naukri_jobs" remains for anon/auth users.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'naukri_jobs'
      AND policyname = 'Superadmins full access naukri_jobs'
  ) THEN
    CREATE POLICY "Superadmins full access naukri_jobs"
    ON public.naukri_jobs
    FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;
