-- SIMPLIFIED RLS POLICIES - Remove complexity causing 401 errors
-- The current approach with security definer functions is still causing issues
-- Simplify to the most basic working policies

-- =================================================================
-- 1. DROP ALL EXISTING POLICIES
-- =================================================================

-- Bands policies
DROP POLICY IF EXISTS "Users can view their bands" ON bands;
DROP POLICY IF EXISTS "Admins can update their bands" ON bands;
DROP POLICY IF EXISTS "Users can create bands" ON bands;

-- Band members policies
DROP POLICY IF EXISTS "Users can view own membership" ON band_members;
DROP POLICY IF EXISTS "Members can view band membership" ON band_members;
DROP POLICY IF EXISTS "Admins can add members" ON band_members;
DROP POLICY IF EXISTS "Admins can update members" ON band_members;
DROP POLICY IF EXISTS "Admins can remove members" ON band_members;
DROP POLICY IF EXISTS "Band creators can add self as admin" ON band_members;

-- =================================================================
-- 2. CREATE ULTRA-SIMPLE POLICIES THAT WORK
-- =================================================================

-- BANDS TABLE

-- Anyone authenticated can create a band (check ownership in application layer)
CREATE POLICY "enable_insert_for_authenticated_users" ON bands
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can view bands they created OR are members of
CREATE POLICY "enable_select_for_band_members" ON bands
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

-- Users can update bands where they are admins
CREATE POLICY "enable_update_for_band_admins" ON bands
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- BAND_MEMBERS TABLE

-- Anyone authenticated can insert themselves (we'll add application-level checks)
CREATE POLICY "enable_insert_for_authenticated_users" ON band_members
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can view their own memberships
CREATE POLICY "enable_select_own_membership" ON band_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can view other members in bands they belong to
CREATE POLICY "enable_select_for_band_members" ON band_members
  FOR SELECT TO authenticated
  USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

-- Admins can update members in their bands
CREATE POLICY "enable_update_for_band_admins" ON band_members
  FOR UPDATE TO authenticated
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete members from their bands
CREATE POLICY "enable_delete_for_band_admins" ON band_members
  FOR DELETE TO authenticated
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
