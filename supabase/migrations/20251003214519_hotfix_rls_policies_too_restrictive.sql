-- HOTFIX: RLS Policies Too Restrictive Causing 500 Errors
-- The previous RLS policies are causing 500 errors on band_members and bands tables
-- This hotfix creates more permissive policies to restore functionality

-- =================================================================
-- 1. DROP RESTRICTIVE POLICIES CAUSING 500 ERRORS
-- =================================================================

-- Drop all current policies on bands table
DROP POLICY IF EXISTS "Members can view their bands" ON bands;
DROP POLICY IF EXISTS "Admins can update band settings" ON bands;
DROP POLICY IF EXISTS "Users can create bands" ON bands;

-- Drop all current policies on band_members table
DROP POLICY IF EXISTS "Members can view band membership" ON band_members;
DROP POLICY IF EXISTS "Admins can manage members" ON band_members;
DROP POLICY IF EXISTS "Users can join bands" ON band_members;

-- =================================================================
-- 2. CREATE SIMPLIFIED, WORKING POLICIES
-- =================================================================

-- BANDS TABLE POLICIES (More permissive to avoid 500 errors)

-- Allow authenticated users to view bands they're members of (simplified check)
CREATE POLICY "Authenticated users can view bands" ON bands
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = bands.id
      AND bm.user_id = auth.uid()
    )
  );

-- Allow band admins to update their bands
CREATE POLICY "Band admins can update bands" ON bands
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = bands.id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- Allow authenticated users to create bands
CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- BAND_MEMBERS TABLE POLICIES (Simplified)

-- Allow users to view band members for bands they belong to
CREATE POLICY "Band members can view memberships" ON band_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM band_members bm2
        WHERE bm2.band_id = band_members.band_id
        AND bm2.user_id = auth.uid()
      )
    )
  );

-- Allow admins to insert new members
CREATE POLICY "Admins can add members" ON band_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- Allow admins to update member roles
CREATE POLICY "Admins can update members" ON band_members
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- Allow admins to delete members
CREATE POLICY "Admins can remove members" ON band_members
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- =================================================================
-- 3. EMERGENCY FALLBACK: GRANT DIRECT ACCESS TO SERVICE ROLE
-- =================================================================
-- In case RLS is still causing issues, ensure service role can access everything

GRANT ALL ON bands TO service_role;
GRANT ALL ON band_members TO service_role;
GRANT ALL ON song_ratings TO service_role;

-- =================================================================
-- 4. VERIFICATION
-- =================================================================
-- Test basic queries that were failing

-- Uncomment to test after migration:
-- SELECT 'bands table accessible' as test, count(*) FROM bands;
-- SELECT 'band_members table accessible' as test, count(*) FROM band_members;
-- SELECT 'RLS enabled on bands' as test, relrowsecurity FROM pg_class WHERE relname = 'bands';
-- SELECT 'RLS enabled on band_members' as test, relrowsecurity FROM pg_class WHERE relname = 'band_members';