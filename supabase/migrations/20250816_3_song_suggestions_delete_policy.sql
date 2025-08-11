-- Allow band admins and original suggesters to delete song suggestions
-- This fixes cases where delete appears to succeed in UI but is blocked by RLS.

-- Admins can delete any song in their bands
DROP POLICY IF EXISTS "Admins can delete band songs" ON song_suggestions;
CREATE POLICY "Admins can delete band songs" ON song_suggestions
  FOR DELETE USING (
    band_id IN (
      SELECT bm.band_id FROM band_members bm
      WHERE bm.user_id = auth.uid() AND bm.role = 'admin'
    )
  );

-- Suggesters can delete their own songs, only if they belong to the band
DROP POLICY IF EXISTS "Suggesters can delete their own songs" ON song_suggestions;
CREATE POLICY "Suggesters can delete their own songs" ON song_suggestions
  FOR DELETE USING (
    suggested_by = auth.uid()
    AND band_id IN (
      SELECT bm.band_id FROM band_members bm WHERE bm.user_id = auth.uid()
    )
  );


