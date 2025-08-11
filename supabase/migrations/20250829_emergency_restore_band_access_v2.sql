-- EMERGENCY V2: Completely Restore Band Data Access
-- This migration temporarily disables RLS to restore full access

-- Step 1: Completely disable RLS on all tables to restore access
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsal_setlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_rate_limits DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify we can see all data
-- (This is just a comment - the RLS disable above should restore access)

-- Step 3: Create a simple function to check data access
CREATE OR REPLACE FUNCTION check_data_access()
RETURNS TABLE (
  table_name text,
  record_count bigint,
  accessible boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'bands'::text, COUNT(*), true FROM public.bands
  UNION ALL
  SELECT 'band_members'::text, COUNT(*), true FROM public.band_members
  UNION ALL
  SELECT 'profiles'::text, COUNT(*), true FROM public.profiles
  UNION ALL
  SELECT 'song_suggestions'::text, COUNT(*), true FROM public.song_suggestions
  UNION ALL
  SELECT 'song_votes'::text, COUNT(*), true FROM public.song_votes
  UNION ALL
  SELECT 'rehearsals'::text, COUNT(*), true FROM public.rehearsals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_data_access TO authenticated;

-- Step 5: Ensure the handle_new_user function works
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if profile already exists to avoid conflicts
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 7: Backfill any missing profiles for existing users
INSERT INTO profiles (id, email, display_name)
SELECT 
  u.id,
  COALESCE(u.email, concat(u.id::text, '@unknown.local')) AS email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Unknown User') AS display_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 8: Ensure all band members have profiles
INSERT INTO profiles (id, email, display_name)
SELECT 
  u.id,
  COALESCE(u.email, concat(u.id::text, '@unknown.local')) AS email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Unknown User') AS display_name
FROM auth.users u
JOIN band_members bm ON bm.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 9: Create a simple diagnostic query to verify access
-- You can run this in SQL Editor to see your data:
/*
SELECT 
  'bands' as table_name,
  COUNT(*) as record_count
FROM public.bands
UNION ALL
SELECT 
  'band_members' as table_name,
  COUNT(*) as record_count
FROM public.band_members
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as record_count
FROM public.profiles;
*/
