-- CRITICAL FIX: Infinite Recursion in RLS Policies
-- The previous policies query the same table they protect, causing infinite recursion
-- Solution: Use security definer functions to break the recursion chain

-- =================================================================
-- 1. DROP ALL EXISTING PROBLEMATIC POLICIES
-- =================================================================

DROP POLICY IF EXISTS "Authenticated users can view bands" ON bands;
DROP POLICY IF EXISTS "Band admins can update bands" ON bands;
DROP POLICY IF EXISTS "Users can create bands" ON bands;
DROP POLICY IF EXISTS "Band members can view memberships" ON band_members;
DROP POLICY IF EXISTS "Admins can add members" ON band_members;
DROP POLICY IF EXISTS "Admins can update members" ON band_members;
DROP POLICY IF EXISTS "Admins can remove members" ON band_members;

-- =================================================================
-- 2. CREATE SECURITY DEFINER FUNCTIONS (bypass RLS recursion)
-- =================================================================

-- Function to check if user is a band member
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

-- Function to check if user is a band admin
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
-- 3. CREATE NON-RECURSIVE RLS POLICIES USING SECURITY DEFINER FUNCTIONS
-- =================================================================

-- BANDS TABLE POLICIES

CREATE POLICY "Users can view their bands" ON bands
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND is_band_member(id, auth.uid())
  );

CREATE POLICY "Admins can update their bands" ON bands
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND is_band_admin(id, auth.uid())
  );

CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- BAND_MEMBERS TABLE POLICIES

-- Allow users to view their own membership
CREATE POLICY "Users can view own membership" ON band_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Allow band members to view other members in their bands
CREATE POLICY "Members can view band membership" ON band_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND is_band_member(band_id, auth.uid())
  );

-- Allow admins to insert new members
CREATE POLICY "Admins can add members" ON band_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_band_admin(band_id, auth.uid())
  );

-- Allow admins to update member roles
CREATE POLICY "Admins can update members" ON band_members
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND is_band_admin(band_id, auth.uid())
  );

-- Allow admins to delete members
CREATE POLICY "Admins can remove members" ON band_members
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND is_band_admin(band_id, auth.uid())
  );

-- =================================================================
-- 4. SPECIAL CASE: Allow inserting band creator as admin
-- =================================================================

-- When creating a band, the creator needs to be inserted as admin member
-- This needs special handling since they won't be an admin yet
CREATE POLICY "Band creator can add self as admin" ON band_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND role = 'admin'
    AND EXISTS (
      SELECT 1 FROM bands b
      WHERE b.id = band_id
      AND b.created_by = auth.uid()
    )
  );
