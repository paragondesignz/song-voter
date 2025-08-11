-- Fix RLS policy to allow band creators to add themselves as members

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can join bands" ON band_members;
-- Create a new policy that allows users to add themselves to bands
-- This covers both band creation (first member) and joining via invite
CREATE POLICY "Users can join bands" ON band_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
-- Create separate policy for admins to add other users
CREATE POLICY "Admins can add members" ON band_members
  FOR INSERT WITH CHECK (
    user_id != auth.uid() AND -- Not adding themselves
    is_band_admin(band_id, auth.uid()) -- Current user is admin of the band
  );
