-- Fix potentially bad data in song_suggestions table
-- Set any NULL values that shouldn't be NULL

UPDATE song_suggestions
SET
  title = COALESCE(title, 'Untitled'),
  artist = COALESCE(artist, 'Unknown Artist'),
  status = COALESCE(status, 'suggested')
WHERE title IS NULL OR artist IS NULL OR status IS NULL;

-- Fix any invalid status values
UPDATE song_suggestions
SET status = 'suggested'
WHERE status NOT IN ('suggested', 'in_rehearsal', 'practiced');

-- Fix any invalid vocal_type values
UPDATE song_suggestions
SET vocal_type = NULL
WHERE vocal_type IS NOT NULL
  AND vocal_type NOT IN ('male', 'female', 'duet', 'instrumental');
