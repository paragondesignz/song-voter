-- Update voting system to use star ratings instead of upvote/downvote
-- Drop existing vote constraints and update the vote_type column

-- First, drop the existing check constraint
ALTER TABLE song_votes DROP CONSTRAINT IF EXISTS song_votes_vote_type_check;

-- Update the vote_type column to allow star ratings (1-5)
-- We'll keep it as text to maintain compatibility but use it for star ratings
-- '1', '2', '3', '4', '5' for star ratings
ALTER TABLE song_votes 
ADD CONSTRAINT song_votes_vote_type_check 
CHECK (vote_type IN ('1', '2', '3', '4', '5'));

-- Update existing votes to convert upvotes to 4 stars and downvotes to 2 stars
UPDATE song_votes 
SET vote_type = CASE 
  WHEN vote_type = 'upvote' THEN '4'
  WHEN vote_type = 'downvote' THEN '2'
  ELSE vote_type
END
WHERE vote_type IN ('upvote', 'downvote');

-- Create a view for easy star rating calculations
CREATE OR REPLACE VIEW song_ratings AS
SELECT 
  s.id,
  s.band_id,
  s.title,
  s.artist,
  s.album,
  s.album_art_url,
  s.spotify_track_id,
  s.suggested_by,
  s.created_at,
  s.notes,
  s.status,
  COALESCE(ROUND(AVG(CAST(sv.vote_type AS INTEGER)), 1), 0) as average_rating,
  COUNT(sv.id) as total_ratings,
  -- Individual star counts
  COUNT(CASE WHEN sv.vote_type = '5' THEN 1 END) as five_star_count,
  COUNT(CASE WHEN sv.vote_type = '4' THEN 1 END) as four_star_count,
  COUNT(CASE WHEN sv.vote_type = '3' THEN 1 END) as three_star_count,
  COUNT(CASE WHEN sv.vote_type = '2' THEN 1 END) as two_star_count,
  COUNT(CASE WHEN sv.vote_type = '1' THEN 1 END) as one_star_count
FROM song_suggestions s
LEFT JOIN song_votes sv ON s.id = sv.song_suggestion_id
GROUP BY s.id, s.band_id, s.title, s.artist, s.album, s.album_art_url, 
         s.spotify_track_id, s.suggested_by, s.created_at, s.notes, s.status;

-- Update the leaderboard view to use star ratings
DROP MATERIALIZED VIEW IF EXISTS song_leaderboard;

CREATE MATERIALIZED VIEW song_leaderboard AS
SELECT 
  sr.*,
  -- Calculate a weighted score for better ranking
  (sr.average_rating * sr.total_ratings) as weighted_score,
  -- Recent ratings (last 7 days)
  COALESCE(recent_ratings.count, 0) as recent_ratings
FROM song_ratings sr
LEFT JOIN (
  SELECT 
    song_suggestion_id,
    COUNT(*) as count
  FROM song_votes 
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY song_suggestion_id
) recent_ratings ON sr.id = recent_ratings.song_suggestion_id
WHERE sr.total_ratings > 0
ORDER BY sr.average_rating DESC, sr.total_ratings DESC;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_song_leaderboard_band_rating 
ON song_leaderboard (band_id, average_rating DESC, total_ratings DESC);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW song_leaderboard;

-- Add function to update song suggester (admin only)
CREATE OR REPLACE FUNCTION update_song_suggester(
  p_song_id UUID,
  p_new_suggester_id UUID,
  p_admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_band_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get the band_id for the song
  SELECT band_id INTO v_band_id
  FROM song_suggestions
  WHERE id = p_song_id;
  
  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'Song not found';
  END IF;
  
  -- Check if the user is an admin of the band
  SELECT EXISTS(
    SELECT 1 FROM band_members
    WHERE band_id = v_band_id
    AND user_id = p_admin_user_id
    AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only band admins can change song suggesters';
  END IF;
  
  -- Check if the new suggester is a member of the band
  IF NOT EXISTS(
    SELECT 1 FROM band_members
    WHERE band_id = v_band_id
    AND user_id = p_new_suggester_id
  ) THEN
    RAISE EXCEPTION 'New suggester must be a member of the band';
  END IF;
  
  -- Update the suggester
  UPDATE song_suggestions
  SET suggested_by = p_new_suggester_id
  WHERE id = p_song_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_song_suggester TO authenticated;