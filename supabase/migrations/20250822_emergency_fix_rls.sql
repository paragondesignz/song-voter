-- EMERGENCY FIX: Temporarily make RLS more permissive to diagnose issues
-- This will allow authenticated users to see more data while we fix the root cause

-- First ensure the user has a profile
INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
VALUES (
  'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc',
  'user@example.com',  -- This will be updated by the trigger
  'User',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on our main tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'bands', 'band_members', 'song_suggestions', 'song_votes', 'rehearsals', 'rehearsal_setlists')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Create VERY permissive policies for authenticated users (temporary for debugging)

-- PROFILES: Everyone can see all profiles
CREATE POLICY "temp_all_see_profiles" ON public.profiles
  FOR ALL USING (true);

-- BANDS: Authenticated users can see ALL bands (for now)
CREATE POLICY "temp_auth_see_all_bands" ON public.bands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "temp_auth_create_bands" ON public.bands
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "temp_auth_update_own_bands" ON public.bands
  FOR UPDATE USING (created_by = auth.uid());

-- BAND_MEMBERS: Authenticated can see all memberships
CREATE POLICY "temp_auth_see_all_members" ON public.band_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "temp_auth_manage_own_membership" ON public.band_members
  FOR ALL USING (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "temp_admins_manage_members" ON public.band_members
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    band_id IN (
      SELECT band_id FROM public.band_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- SONGS: Authenticated can see all songs
CREATE POLICY "temp_auth_see_all_songs" ON public.song_suggestions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "temp_auth_manage_songs" ON public.song_suggestions
  FOR ALL USING (auth.role() = 'authenticated');

-- VOTES: Authenticated can see all votes
CREATE POLICY "temp_auth_see_all_votes" ON public.song_votes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "temp_auth_manage_own_votes" ON public.song_votes
  FOR ALL USING (auth.role() = 'authenticated' AND voter_id = auth.uid());

-- REHEARSALS: Authenticated can see all
CREATE POLICY "temp_auth_see_all_rehearsals" ON public.rehearsals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "temp_admins_manage_rehearsals" ON public.rehearsals
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    band_id IN (
      SELECT band_id FROM public.band_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- SETLISTS: Authenticated can see all
CREATE POLICY "temp_auth_see_all_setlists" ON public.rehearsal_setlists
  FOR SELECT USING (auth.role() = 'authenticated');

-- Also ensure the test user has at least one band to work with
DO $$
BEGIN
  -- Check if user has any bands
  IF NOT EXISTS (
    SELECT 1 FROM public.band_members 
    WHERE user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc'
  ) THEN
    -- Create a test band for the user
    INSERT INTO public.bands (name, created_by, invite_code)
    VALUES ('My First Band', 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc', 'TEST123')
    ON CONFLICT DO NOTHING;
    
    -- Add user as admin of the band
    INSERT INTO public.band_members (band_id, user_id, role)
    SELECT id, 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc', 'admin'
    FROM public.bands
    WHERE created_by = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc'
    AND name = 'My First Band'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Log what we have
DO $$
DECLARE
  profile_count INTEGER;
  band_count INTEGER;
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';
  SELECT COUNT(*) INTO band_count FROM public.bands WHERE created_by = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';
  SELECT COUNT(*) INTO member_count FROM public.band_members WHERE user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';
  
  RAISE NOTICE 'User c53b14ff-3059-4dc7-99dd-4e7e7eb107dc has % profiles, created % bands, member of % bands', 
    profile_count, band_count, member_count;
END $$;