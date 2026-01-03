-- Create storage bucket for avatars (if storage schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create storage bucket for resumes (if storage schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('resumes', 'resumes', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- RLS policies for avatars bucket (public read, authenticated write for own files)
-- Only create if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
    
    CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- RLS policies for resumes bucket (private, only owner can access)
-- Only create if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own resumes" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own resume" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own resume" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own resume" ON storage.objects;
    
    CREATE POLICY "Users can view their own resumes"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "Users can upload their own resume"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "Users can update their own resume"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "Users can delete their own resume"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Add resume_url column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url text;