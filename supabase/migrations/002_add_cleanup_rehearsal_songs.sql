-- Create RPC to finalize past rehearsals and move their songs to "practiced"
-- This function is called from the app on dashboard load.
-- It marks any past rehearsals as completed and updates songs in those
-- rehearsals' setlists to status = 'practiced'. Returns number of songs updated.

CREATE OR REPLACE FUNCTION cleanup_rehearsal_songs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Mark past rehearsals as completed for bands the caller belongs to
  UPDATE rehearsals r
  SET status = 'completed'
  WHERE r.rehearsal_date < CURRENT_DATE
    AND r.status <> 'completed'
    AND r.band_id IN (
      SELECT bm.band_id FROM band_members bm WHERE bm.user_id = auth.uid()
    );

  -- Move songs in completed rehearsals to practiced
  UPDATE song_suggestions ss
  SET status = 'practiced'
  WHERE ss.status <> 'practiced'
    AND ss.id IN (
      SELECT DISTINCT rs.song_suggestion_id
      FROM rehearsal_setlists rs
      JOIN rehearsals r ON r.id = rs.rehearsal_id
      WHERE r.status = 'completed'
        AND r.band_id IN (
          SELECT bm.band_id FROM band_members bm WHERE bm.user_id = auth.uid()
        )
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Expose via PostgREST (RPC): no explicit grants needed for functions in public schema
-- SECURITY DEFINER ensures the function can perform updates while still
-- scoping by auth.uid() so users can only affect their own bands' data.


