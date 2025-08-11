-- EMERGENCY: Restore Band Data Access
-- This migration temporarily relaxes RLS policies to restore access

-- First, let's see what's happening with the current policies
-- Temporarily disable RLS on critical tables to restore access
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with very permissive policies for now
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies to restore access
-- Users can view all profiles (temporarily)
CREATE POLICY "Temporary: Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can view all bands (temporarily)
CREATE POLICY "Temporary: Users can view all bands" ON bands
  FOR SELECT USING (true);

-- Users can create bands
CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update bands they created
CREATE POLICY "Users can update their own bands" ON bands
  FOR UPDATE USING (created_by = auth.uid());

-- Users can view all band members (temporarily)
CREATE POLICY "Temporary: Users can view all band members" ON band_members
  FOR SELECT USING (true);

-- Users can join bands
CREATE POLICY "Users can join bands" ON band_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Band admins can manage members
CREATE POLICY "Band admins can manage members" ON band_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- Users can delete their own band memberships
CREATE POLICY "Users can leave bands" ON band_members
  FOR DELETE USING (user_id = auth.uid());

-- Ensure the handle_new_user function works
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
