-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS song_leaderboard;
-- Create updated materialized view for upvote/downvote system
CREATE MATERIALIZED VIEW song_leaderboard AS
SELECT 
  s.id,
  s.band_id,
  s.title,
  s.artist,
  s.album,
  s.album_art_url,
  s.spotify_track_id,
  s.created_at,
  COALESCE(upvotes.count, 0) as upvote_count,
  COALESCE(downvotes.count, 0) as downvote_count,
  (COALESCE(upvotes.count, 0) - COALESCE(downvotes.count, 0)) as vote_count,
  COALESCE(recent_votes.count, 0) as recent_votes
FROM song_suggestions s
LEFT JOIN (
  SELECT 
    song_suggestion_id,
    COUNT(*) as count
  FROM song_votes 
  WHERE vote_type = 'upvote'
  GROUP BY song_suggestion_id
) upvotes ON s.id = upvotes.song_suggestion_id
LEFT JOIN (
  SELECT 
    song_suggestion_id,
    COUNT(*) as count
  FROM song_votes 
  WHERE vote_type = 'downvote'
  GROUP BY song_suggestion_id
) downvotes ON s.id = downvotes.song_suggestion_id
LEFT JOIN (
  SELECT 
    song_suggestion_id,
    COUNT(*) as count
  FROM song_votes 
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY song_suggestion_id
) recent_votes ON s.id = recent_votes.song_suggestion_id
WHERE (COALESCE(upvotes.count, 0) + COALESCE(downvotes.count, 0)) > 0
ORDER BY vote_count DESC, upvote_count DESC;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_song_leaderboard_band_vote_count 
ON song_leaderboard (band_id, vote_count DESC);
-- Refresh the materialized view
REFRESH MATERIALIZED VIEW song_leaderboard;
