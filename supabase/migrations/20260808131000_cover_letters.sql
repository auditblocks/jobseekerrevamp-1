-- Cover letters generated via the new generate-cover-letter edge function.
-- Saved (not thrown away after generation) so users can revisit/edit past letters.

CREATE TABLE IF NOT EXISTS public.cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    naukri_job_id UUID REFERENCES public.naukri_jobs(id) ON DELETE SET NULL,
    job_title TEXT,
    company_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user_created
  ON public.cover_letters (user_id, created_at DESC);

ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cover letters"
  ON public.cover_letters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cover letters"
  ON public.cover_letters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cover letters"
  ON public.cover_letters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cover letters"
  ON public.cover_letters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
    EXECUTE 'CREATE POLICY "Superadmins manage cover_letters" ON public.cover_letters FOR ALL USING (public.is_superadmin())';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tg_cover_letters_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_cover_letters_touch ON public.cover_letters;
CREATE TRIGGER tg_cover_letters_touch
  BEFORE UPDATE ON public.cover_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cover_letters_touch();
