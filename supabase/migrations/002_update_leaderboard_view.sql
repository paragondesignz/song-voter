-- Update materialized view to include spotify_track_id for embed support
DROP MATERIALIZED VIEW IF EXISTS song_leaderboard;

CREATE MATERIALIZED VIEW song_leaderboard AS
SELECT 
  ss.id,
  ss.band_id,
  ss.title,
  ss.artist,
  ss.album_art_url,
  ss.spotify_track_id,
  ss.suggested_by,
  COUNT(sv.id) as vote_count,
  COUNT(CASE WHEN sv.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_votes,
  ss.created_at as suggested_at
FROM song_suggestions ss
LEFT JOIN song_votes sv ON ss.id = sv.song_suggestion_id
GROUP BY ss.id, ss.band_id, ss.title, ss.artist, ss.album_art_url, ss.spotify_track_id, ss.suggested_by, ss.created_at;