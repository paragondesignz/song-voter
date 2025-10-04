-- Add missing UPDATE policy for song_suggestions
-- This was preventing users from editing song details

CREATE POLICY "Band members can update their band's songs" ON song_suggestions
  FOR UPDATE USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );
