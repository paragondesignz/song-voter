-- Enable RLS on song_votes table if not already enabled
ALTER TABLE song_votes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can vote on songs in their bands" ON song_votes;
DROP POLICY IF EXISTS "Users can view votes in their bands" ON song_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON song_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON song_votes;

-- Create comprehensive RLS policies for song_votes

-- Allow users to view votes for songs in bands they belong to
CREATE POLICY "Users can view votes in their bands" ON song_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = song_votes.band_id
      AND bm.user_id = auth.uid()
    )
  );

-- Allow users to insert votes for songs in bands they belong to
CREATE POLICY "Users can vote on songs in their bands" ON song_votes
  FOR INSERT WITH CHECK (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = song_votes.band_id
      AND bm.user_id = auth.uid()
    )
  );

-- Allow users to update their own votes
CREATE POLICY "Users can update their own votes" ON song_votes
  FOR UPDATE USING (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = song_votes.band_id
      AND bm.user_id = auth.uid()
    )
  ) WITH CHECK (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = song_votes.band_id
      AND bm.user_id = auth.uid()
    )
  );

-- Allow users to delete their own votes
CREATE POLICY "Users can delete their own votes" ON song_votes
  FOR DELETE USING (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = song_votes.band_id
      AND bm.user_id = auth.uid()
    )
  );