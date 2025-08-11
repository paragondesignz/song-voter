-- Allow band admins and original suggesters to delete song suggestions

DROP POLICY IF EXISTS "Admins can delete band songs" ON song_suggestions;
CREATE POLICY "Admins can delete band songs" ON song_suggestions
  FOR DELETE USING (
    band_id IN (
      SELECT bm.band_id FROM band_members bm
      WHERE bm.user_id = auth.uid() AND bm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Suggesters can delete their own songs" ON song_suggestions;
CREATE POLICY "Suggesters can delete their own songs" ON song_suggestions
  FOR DELETE USING (
    suggested_by = auth.uid()
    AND band_id IN (
      SELECT bm.band_id FROM band_members bm WHERE bm.user_id = auth.uid()
    )
  );


