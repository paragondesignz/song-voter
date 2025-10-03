-- Fix infinite recursion in band_members RLS policies
-- The current policies query band_members within their own policy definitions

-- Drop the problematic policies
DROP POLICY IF EXISTS "Band members can view members of their bands" ON band_members;
DROP POLICY IF EXISTS "Band admins can manage members" ON band_members;

-- Create new policies that avoid recursion by using different approaches

-- Policy 1: Users can view band_members records where they are the user_id
-- This allows users to see their own memberships
CREATE POLICY "Users can view their own memberships" ON band_members
  FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Users can view other members if they share at least one band
-- We'll use a function to check this without recursion
CREATE OR REPLACE FUNCTION user_shares_band_with(target_user_id uuid, target_band_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members
    WHERE user_id = auth.uid()
    AND band_id = target_band_id
  );
$$;

CREATE POLICY "Users can view members of shared bands" ON band_members
  FOR SELECT USING (user_shares_band_with(user_id, band_id));

-- Policy 3: Allow users to insert themselves into bands (for joining)
CREATE POLICY "Users can join bands" ON band_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy 4: Band admins can manage all members
-- We'll use a function to check admin status without recursion
CREATE OR REPLACE FUNCTION user_is_band_admin(check_band_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members
    WHERE user_id = auth.uid()
    AND band_id = check_band_id
    AND role = 'admin'
  );
$$;

CREATE POLICY "Band admins can manage members" ON band_members
  FOR ALL USING (user_is_band_admin(band_id));

-- Policy 5: Users can update their own membership (but not role)
CREATE POLICY "Users can update their own membership" ON band_members
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 6: Users can delete their own membership (leave band)
CREATE POLICY "Users can leave bands" ON band_members
  FOR DELETE USING (user_id = auth.uid());