-- FINAL FIX: Use security definer functions to prevent recursion
-- The previous policies query band_members from within band_members policies = infinite recursion
-- Solution: Security definer functions that bypass RLS

-- =================================================================
-- 1. CREATE SECURITY DEFINER FUNCTIONS (BYPASS RLS)
-- =================================================================

CREATE OR REPLACE FUNCTION is_band_member(band_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_id_param
    AND user_id = user_id_param
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_band_admin(band_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_id_param
    AND user_id = user_id_param
    AND role = 'admin'
  );
END;
$$;

-- =================================================================
-- 2. DROP ALL EXISTING POLICIES
-- =================================================================

DROP POLICY IF EXISTS "bands_insert_authenticated" ON bands;
DROP POLICY IF EXISTS "bands_select_own_or_member" ON bands;
DROP POLICY IF EXISTS "bands_update_admin" ON bands;

DROP POLICY IF EXISTS "band_members_insert_authenticated" ON band_members;
DROP POLICY IF EXISTS "band_members_select_own" ON band_members;
DROP POLICY IF EXISTS "band_members_select_same_band" ON band_members;
DROP POLICY IF EXISTS "band_members_update_admin" ON band_members;
DROP POLICY IF EXISTS "band_members_delete_admin" ON band_members;

-- =================================================================
-- 3. CREATE NON-RECURSIVE POLICIES USING SECURITY DEFINER FUNCTIONS
-- =================================================================

-- BANDS POLICIES

CREATE POLICY "bands_insert_authenticated" ON bands
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bands_select_member" ON bands
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR is_band_member(id, auth.uid())
    )
  );

CREATE POLICY "bands_update_admin" ON bands
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND is_band_admin(id, auth.uid())
  );

-- BAND_MEMBERS POLICIES

CREATE POLICY "band_members_insert_authenticated" ON band_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "band_members_select_own" ON band_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "band_members_select_member" ON band_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_band_member(band_id, auth.uid())
  );

CREATE POLICY "band_members_update_admin" ON band_members
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND is_band_admin(band_id, auth.uid())
  );

CREATE POLICY "band_members_delete_admin" ON band_members
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND is_band_admin(band_id, auth.uid())
  );
