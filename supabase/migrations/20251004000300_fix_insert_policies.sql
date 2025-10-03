-- FIX: INSERT policies not working - role specification issue
-- Error: "new row violates row-level security policy for table bands"
-- Issue: Using TO authenticated without proper role setup

-- =================================================================
-- 1. DROP PROBLEMATIC INSERT POLICIES
-- =================================================================

DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON bands;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON band_members;

-- =================================================================
-- 2. CREATE WORKING INSERT POLICIES
-- =================================================================

-- BANDS: Allow authenticated users to create bands
CREATE POLICY "bands_insert_policy" ON bands
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- BAND_MEMBERS: Allow authenticated users to insert members
CREATE POLICY "band_members_insert_policy" ON band_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
