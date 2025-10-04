-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Band members can update their band's songs" ON song_suggestions;

-- Create new update policy that allows admins to change suggested_by
CREATE POLICY "Band members can update their band's songs" ON song_suggestions
  FOR UPDATE USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Allow update if user is in the band
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
    -- For non-admin members, they can only update if they're not changing suggested_by
    -- OR if they are admin (role = 'admin'), allow any suggested_by change
    AND (
      suggested_by = (SELECT suggested_by FROM song_suggestions WHERE id = song_suggestions.id)
      OR
      EXISTS (
        SELECT 1 FROM band_members
        WHERE user_id = auth.uid()
        AND band_id = song_suggestions.band_id
        AND role = 'admin'
      )
    )
  );
