-- ENABLE RLS AND SET SIMPLE WORKING POLICIES
-- RLS was disabled in previous migrations but never re-enabled
-- This migration enables RLS and creates the simplest possible working policies

-- =================================================================
-- 1. ENABLE RLS ON BOTH TABLES
-- =================================================================

ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 2. DROP ALL EXISTING POLICIES (CLEANUP)
-- =================================================================

DROP POLICY IF EXISTS "bands_insert_authenticated" ON bands;
DROP POLICY IF EXISTS "bands_select_member" ON bands;
DROP POLICY IF EXISTS "bands_update_admin" ON bands;

DROP POLICY IF EXISTS "band_members_insert_authenticated" ON band_members;
DROP POLICY IF EXISTS "band_members_select_own" ON band_members;
DROP POLICY IF EXISTS "band_members_select_member" ON band_members;
DROP POLICY IF EXISTS "band_members_update_admin" ON band_members;
DROP POLICY IF EXISTS "band_members_delete_admin" ON band_members;

-- =================================================================
-- 3. CREATE SIMPLE PERMISSIVE POLICIES
-- =================================================================

-- BANDS: Allow all authenticated operations (rely on app-level security)
CREATE POLICY "bands_all_authenticated" ON bands
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- BAND_MEMBERS: Allow all authenticated operations (rely on app-level security)
CREATE POLICY "band_members_all_authenticated" ON band_members
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
