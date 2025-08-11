-- Debug and fix band creation RLS policy
-- The issue might be that auth.uid() is not matching the created_by value

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create bands" ON bands;
-- Create a new policy that's more explicit and allows debugging
CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by = auth.uid()
  );
-- Also ensure we can see our own bands
DROP POLICY IF EXISTS "Band members can view their bands" ON bands;
CREATE POLICY "Band members can view their bands" ON bands
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR  -- Band creator can always see their band
      id IN (
        SELECT band_id FROM band_members WHERE user_id = auth.uid()
      )
    )
  );
