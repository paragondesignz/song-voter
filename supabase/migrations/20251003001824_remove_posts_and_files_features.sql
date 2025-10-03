-- Remove band posts and files features
-- This removes all database tables and storage related to posts and file uploads

-- Drop band posts related tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS band_post_comments CASCADE;
DROP TABLE IF EXISTS band_post_likes CASCADE;
DROP TABLE IF EXISTS band_posts CASCADE;

-- Drop band files related tables
DROP TABLE IF EXISTS band_files CASCADE;
DROP TABLE IF EXISTS band_folders CASCADE;

-- Remove storage policies for band files
DROP POLICY IF EXISTS "Band members can view files" ON storage.objects;
DROP POLICY IF EXISTS "Band members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "File owners and admins can update files" ON storage.objects;
DROP POLICY IF EXISTS "File owners and admins can delete files" ON storage.objects;

-- Drop the band-files storage bucket if it exists
DELETE FROM storage.buckets WHERE id = 'band-files';

-- Note: We're keeping the basic band structure (bands table, band_members table)
-- as those are core to the application functionality