-- Create a new storage bucket for blog images
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Allow public access to any files in the "blog-images" bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access'
    ) THEN
        create policy "Public Access"
          on storage.objects for select
          using ( bucket_id = 'blog-images' );
    END IF;
END $$;

-- Allow authenticated users to upload files to the "blog-images" bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated users can upload'
    ) THEN
        create policy "Authenticated users can upload"
          on storage.objects for insert
          with check ( bucket_id = 'blog-images' and auth.role() = 'authenticated' );
    END IF;
END $$;

-- Allow authenticated users to update files in the "blog-images" bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated users can update'
    ) THEN
        create policy "Authenticated users can update"
          on storage.objects for update
          using ( bucket_id = 'blog-images' and auth.role() = 'authenticated' );
    END IF;
END $$;

-- Allow authenticated users to delete files in the "blog-images" bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated users can delete'
    ) THEN
        create policy "Authenticated users can delete"
          on storage.objects for delete
          using ( bucket_id = 'blog-images' and auth.role() = 'authenticated' );
    END IF;
END $$;
