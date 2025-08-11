-- Fix Band Member Authentication Issues
-- Re-enable RLS with proper policies and fix profile creation

-- First, ensure all tables have RLS enabled
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsal_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Band members can view profiles in their bands" ON profiles;
DROP POLICY IF EXISTS "Users can create bands" ON bands;
DROP POLICY IF EXISTS "Band members can view their bands" ON bands;
DROP POLICY IF EXISTS "Band members can view members of their bands" ON band_members;
DROP POLICY IF EXISTS "Band admins can manage members" ON band_members;
DROP POLICY IF EXISTS "Users can join bands" ON band_members;

-- Create proper profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Band members can view profiles in their bands" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT bm2.user_id
      FROM band_members bm2
      WHERE bm2.band_id IN (
        SELECT bm.band_id
        FROM band_members bm
        WHERE bm.user_id = auth.uid()
      )
    )
  );

-- Create proper bands policies
CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Band members can view their bands" ON bands
  FOR SELECT USING (
    id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band admins can update band settings" ON bands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = bands.id
      AND band_members.user_id = auth.uid()
      AND band_members.role = 'admin'
    )
  );

-- Create proper band_members policies
CREATE POLICY "Band members can view members of their bands" ON band_members
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band admins can manage members" ON band_members
  FOR ALL USING (
    band_id IN (
      SELECT band_id FROM band_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can join bands" ON band_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ensure the handle_new_user function works properly
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

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a function to ensure profile exists for existing users
CREATE OR REPLACE FUNCTION ensure_profile_exists(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile if it doesn't exist
  INSERT INTO profiles (id, email, display_name)
  SELECT 
    u.id,
    COALESCE(u.email, concat(u.id::text, '@unknown.local')) AS email,
    COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Unknown User') AS display_name
  FROM auth.users u
  WHERE u.id = user_uuid
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_uuid);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_profile_exists TO authenticated;

-- Backfill any missing profiles for existing users
INSERT INTO profiles (id, email, display_name)
SELECT 
  u.id,
  COALESCE(u.email, concat(u.id::text, '@unknown.local')) AS email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Unknown User') AS display_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure all band members have profiles
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
