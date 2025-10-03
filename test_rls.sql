-- Test RLS policies to understand what's failing
-- Run this to see the actual state

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('bands', 'band_members');

-- List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('bands', 'band_members')
ORDER BY tablename, policyname;

-- Check if functions exist
SELECT
  proname,
  prosecdef
FROM pg_proc
WHERE proname IN ('is_band_member', 'is_band_admin');
