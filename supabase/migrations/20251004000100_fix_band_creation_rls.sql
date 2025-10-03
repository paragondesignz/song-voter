-- FIX: Band creation failing with 401 errors
-- Issue: When creating a band, the creator can't read their own newly created band
-- due to RLS requiring membership, but they aren't a member yet

-- =================================================================
-- 1. DROP THE PROBLEMATIC POLICY
-- =================================================================

DROP POLICY IF EXISTS "Band creator can add self as admin" ON band_members;

-- =================================================================
-- 2. CREATE IMPROVED POLICY THAT DOESN'T DEPEND ON BANDS RLS
-- =================================================================

-- Allow users to add themselves as admin members when they're the band creator
-- This uses a security definer function to bypass RLS on the bands table check
CREATE OR REPLACE FUNCTION user_created_band(band_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bands
    WHERE id = band_id_param
    AND created_by = user_id_param
  );
END;
$$;

-- Now create the policy using the security definer function
CREATE POLICY "Band creators can add self as admin" ON band_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND role = 'admin'
    AND user_created_band(band_id, auth.uid())
  );
