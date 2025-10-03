-- FIX: Policy syntax - FOR ALL might not work, create explicit policies

-- =================================================================
-- 1. DROP THE "ALL" POLICIES
-- =================================================================

DROP POLICY IF EXISTS "bands_all_authenticated" ON bands;
DROP POLICY IF EXISTS "band_members_all_authenticated" ON band_members;

-- =================================================================
-- 2. CREATE EXPLICIT POLICIES FOR EACH OPERATION
-- =================================================================

-- BANDS TABLE

CREATE POLICY "bands_select" ON bands
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "bands_insert" ON bands
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bands_update" ON bands
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bands_delete" ON bands
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- BAND_MEMBERS TABLE

CREATE POLICY "band_members_select" ON band_members
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "band_members_insert" ON band_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "band_members_update" ON band_members
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "band_members_delete" ON band_members
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
