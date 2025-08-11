-- Diagnostic Queries to Check Data Access
-- Run these in your Supabase SQL Editor to see what's happening

-- 1. Check if RLS is enabled/disabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('bands', 'band_members', 'profiles', 'song_suggestions', 'song_votes', 'rehearsals');

-- 2. Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('bands', 'band_members', 'profiles');

-- 3. Check data counts (this should work if RLS is disabled)
SELECT 'bands' as table_name, COUNT(*) as record_count FROM public.bands
UNION ALL
SELECT 'band_members' as table_name, COUNT(*) as record_count FROM public.band_members
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM public.profiles
UNION ALL
SELECT 'song_suggestions' as table_name, COUNT(*) as record_count FROM public.song_suggestions
UNION ALL
SELECT 'song_votes' as table_name, COUNT(*) as record_count FROM public.song_votes
UNION ALL
SELECT 'rehearsals' as table_name, COUNT(*) as record_count FROM public.rehearsals;

-- 4. Check your specific band data
SELECT 
  b.id as band_id,
  b.name as band_name,
  b.created_by,
  b.shared_password is not null as has_shared_password
FROM public.bands b
ORDER BY b.created_at DESC;

-- 5. Check band members
SELECT 
  bm.band_id,
  b.name as band_name,
  bm.user_id,
  p.display_name,
  p.email,
  bm.role,
  bm.joined_at
FROM public.band_members bm
JOIN public.bands b ON b.id = bm.band_id
JOIN public.profiles p ON p.id = bm.user_id
ORDER BY b.name, bm.joined_at;

-- 6. Check if you have a profile
SELECT 
  id,
  email,
  display_name,
  created_at
FROM public.profiles 
WHERE email = 'your-email@example.com'; -- Replace with your actual email

-- 7. Check auth.users table (this should always be accessible)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;
