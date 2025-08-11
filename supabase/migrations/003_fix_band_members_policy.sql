-- Fix infinite recursion in band_members RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Band members can view members of their bands" ON band_members;
DROP POLICY IF EXISTS "Band admins can manage members" ON band_members;
-- Create a security-definer function to check band membership without recursion
CREATE OR REPLACE FUNCTION is_band_member(band_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members 
    WHERE band_id = band_uuid 
    AND user_id = user_uuid
  );
$$;
-- Create a security-definer function to check admin status
CREATE OR REPLACE FUNCTION is_band_admin(band_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members 
    WHERE band_id = band_uuid 
    AND user_id = user_uuid 
    AND role = 'admin'
  );
$$;
-- Create new non-recursive policies using the functions
CREATE POLICY "Band members can view members of their bands" ON band_members
  FOR SELECT USING (is_band_member(band_id, auth.uid()));
CREATE POLICY "Band admins can manage members" ON band_members
  FOR ALL USING (is_band_admin(band_id, auth.uid()));
-- Allow users to join bands (INSERT policy)
CREATE POLICY "Users can join bands" ON band_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
