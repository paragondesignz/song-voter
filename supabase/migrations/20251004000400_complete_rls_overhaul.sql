-- COMPLETE RLS OVERHAUL - Fix all TO authenticated issues
-- All policies using TO authenticated are failing
-- Replace with standard RLS syntax using auth.uid() checks

-- =================================================================
-- 1. DROP ALL EXISTING POLICIES ON BANDS AND BAND_MEMBERS
-- =================================================================

DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON bands;
DROP POLICY IF EXISTS "enable_select_for_band_members" ON bands;
DROP POLICY IF EXISTS "enable_update_for_band_admins" ON bands;
DROP POLICY IF EXISTS "bands_insert_policy" ON bands;

DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON band_members;
DROP POLICY IF EXISTS "enable_select_own_membership" ON band_members;
DROP POLICY IF EXISTS "enable_select_for_band_members" ON band_members;
DROP POLICY IF EXISTS "enable_update_for_band_admins" ON band_members;
DROP POLICY IF EXISTS "enable_delete_for_band_admins" ON band_members;
DROP POLICY IF EXISTS "band_members_insert_policy" ON band_members;

-- =================================================================
-- 2. CREATE WORKING POLICIES WITHOUT TO authenticated
-- =================================================================

-- BANDS TABLE POLICIES

-- Allow authenticated users to insert bands
CREATE POLICY "bands_insert_authenticated" ON bands
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view bands they created or are members of
CREATE POLICY "bands_select_own_or_member" ON bands
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR id IN (
        SELECT band_id FROM band_members WHERE user_id = auth.uid()
      )
    )
  );

-- Allow admins to update their bands
CREATE POLICY "bands_update_admin" ON bands
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- BAND_MEMBERS TABLE POLICIES

-- Allow authenticated users to insert member records
CREATE POLICY "band_members_insert_authenticated" ON band_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own memberships
CREATE POLICY "band_members_select_own" ON band_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Allow members to view other members in the same band
CREATE POLICY "band_members_select_same_band" ON band_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

-- Allow admins to update members
CREATE POLICY "band_members_update_admin" ON band_members
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete members
CREATE POLICY "band_members_delete_admin" ON band_members
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
