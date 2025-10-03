-- NUCLEAR FIX: Find and fix ALL empty string issues in song_suggestions
-- The previous migration might not have caught all cases

-- First, let's see what columns exist and fix them all
-- Fix any text representation of empty strings in integer columns

-- Use a different approach - update where the cast fails
UPDATE song_suggestions
SET
  duration_ms = CASE
    WHEN duration_ms IS NOT NULL AND CAST(duration_ms AS TEXT) = '' THEN NULL
    ELSE duration_ms
  END,
  bpm = CASE
    WHEN bpm IS NOT NULL AND CAST(bpm AS TEXT) = '' THEN NULL
    ELSE bpm
  END
WHERE
  (duration_ms IS NOT NULL AND CAST(duration_ms AS TEXT) = '')
  OR (bpm IS NOT NULL AND CAST(bpm AS TEXT) = '');

-- Also check if there are any other weird values
-- Set to NULL if not a valid integer
UPDATE song_suggestions
SET duration_ms = NULL
WHERE duration_ms IS NOT NULL
  AND NOT (CAST(duration_ms AS TEXT) ~ '^[0-9]+$');

UPDATE song_suggestions
SET bpm = NULL
WHERE bpm IS NOT NULL
  AND NOT (CAST(bpm AS TEXT) ~ '^[0-9]+$');
