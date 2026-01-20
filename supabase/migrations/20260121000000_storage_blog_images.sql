-- Create a new storage bucket for blog images
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Allow public access to any files in the "blog-images" bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'blog-images' );

-- Allow authenticated users to upload files to the "blog-images" bucket
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'blog-images' and auth.role() = 'authenticated' );

-- Allow authenticated users to update files in the "blog-images" bucket
create policy "Authenticated users can update"
  on storage.objects for update
  using ( bucket_id = 'blog-images' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete files in the "blog-images" bucket
create policy "Authenticated users can delete"
  on storage.objects for delete
  using ( bucket_id = 'blog-images' and auth.role() = 'authenticated' );
