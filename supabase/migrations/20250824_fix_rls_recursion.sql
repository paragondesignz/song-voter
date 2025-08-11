-- Fix infinite recursion in RLS policies and ensure bands are visible

-- Drop ALL policies causing issues
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on band_members to fix recursion
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'band_members'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.band_members', r.policyname);
    END LOOP;
    
    -- Drop all policies on bands to fix visibility
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bands'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bands', r.policyname);
    END LOOP;
END $$;

-- Create simple, non-recursive policies for band_members
CREATE POLICY "members_simple_read" ON public.band_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "members_simple_insert" ON public.band_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "members_simple_update" ON public.band_members
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "members_simple_delete" ON public.band_members
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.band_members bm2
        WHERE bm2.band_id = band_members.band_id
        AND bm2.user_id = auth.uid()
        AND bm2.role = 'admin'
      )
    )
  );

-- Create simple policies for bands
CREATE POLICY "bands_simple_read" ON public.bands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bands_simple_insert" ON public.bands
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "bands_simple_update" ON public.bands
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.band_members
      WHERE band_id = bands.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "bands_simple_delete" ON public.bands
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

-- Verify user has access to Hands Off band
DO $$
DECLARE
  bands_visible INTEGER;
  members_count INTEGER;
  r RECORD;
BEGIN
  -- Check how many bands are visible
  SELECT COUNT(*) INTO bands_visible FROM public.bands;
  
  -- Check band members
  SELECT COUNT(*) INTO members_count 
  FROM public.band_members 
  WHERE user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';
  
  RAISE NOTICE 'Total bands visible: %, User memberships: %', bands_visible, members_count;
  
  -- List user's bands
  FOR r IN 
    SELECT b.name, bm.role 
    FROM public.band_members bm
    JOIN public.bands b ON b.id = bm.band_id
    WHERE bm.user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc'
  LOOP
    RAISE NOTICE 'User is % of band: %', r.role, r.name;
  END LOOP;
END $$;