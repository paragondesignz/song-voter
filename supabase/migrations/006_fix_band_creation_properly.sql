-- Properly fix band creation RLS issue
-- The problem is that "Band admins can manage members" policy uses FOR ALL 
-- which blocks band creation since the user isn't an admin yet

-- Drop all conflicting policies
DROP POLICY IF EXISTS "Band admins can manage members" ON band_members;
DROP POLICY IF EXISTS "Users can join bands" ON band_members;  
DROP POLICY IF EXISTS "Admins can add members" ON band_members;

-- Create separate policies for different operations
-- 1. Allow users to add themselves (covers band creation and joining)
CREATE POLICY "Users can add themselves as members" ON band_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 2. Allow admins to manage existing members (UPDATE/DELETE only, not INSERT)
CREATE POLICY "Band admins can update members" ON band_members
  FOR UPDATE USING (is_band_admin(band_id, auth.uid()));

CREATE POLICY "Band admins can remove members" ON band_members  
  FOR DELETE USING (is_band_admin(band_id, auth.uid()));

-- 3. Allow users to remove themselves (leave band)
CREATE POLICY "Users can remove themselves" ON band_members
  FOR DELETE USING (user_id = auth.uid());