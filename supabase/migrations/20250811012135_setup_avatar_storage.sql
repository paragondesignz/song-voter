-- Create storage bucket for avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
-- Enable RLS on storage.objects
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');
-- Allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
-- Allow authenticated users to update their own avatar  
create policy "Users can update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
-- Allow authenticated users to delete their own avatar
create policy "Users can delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
