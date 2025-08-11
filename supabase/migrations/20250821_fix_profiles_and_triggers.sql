-- Fix profile creation and ensure all users have profiles

-- First, create profiles for any existing users who don't have one
INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) as display_name,
  created_at,
  NOW() as updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.created_at,
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    updated_at = NOW();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates to ensure email stays in sync
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email = new.email,
    updated_at = NOW()
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update profile policies to be more permissive for initial setup
DROP POLICY IF EXISTS "users_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "system_create_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

-- Allow authenticated users to read all profiles
CREATE POLICY "authenticated_read_profiles" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to insert their own profile (in case trigger fails)
CREATE POLICY "users_insert_own_profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.bands TO authenticated;
GRANT ALL ON public.band_members TO authenticated;
GRANT ALL ON public.song_suggestions TO authenticated;
GRANT ALL ON public.song_votes TO authenticated;
GRANT ALL ON public.rehearsals TO authenticated;
GRANT ALL ON public.rehearsal_setlists TO authenticated;

-- Verify the user has a profile (this will create one if missing due to our INSERT above)
DO $$
DECLARE
  user_count INTEGER;
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  
  RAISE NOTICE 'Users: %, Profiles: %', user_count, profile_count;
  
  IF user_count != profile_count THEN
    RAISE WARNING 'User/Profile count mismatch! Some users may not have profiles.';
  END IF;
END $$;