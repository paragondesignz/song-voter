-- FIX: Convert empty strings to NULL in integer columns
-- Error 22P02: invalid input syntax for type integer: ""
-- Some records have empty strings in integer columns instead of NULL

-- Fix duration_ms - convert empty strings to NULL
UPDATE song_suggestions
SET duration_ms = NULL
WHERE duration_ms::text = '';

-- Fix bpm - convert empty strings to NULL
UPDATE song_suggestions
SET bpm = NULL
WHERE bpm::text = '';

-- Add constraints to prevent this in the future
-- Ensure these columns only accept integers or NULL, never empty strings
ALTER TABLE song_suggestions
ALTER COLUMN duration_ms TYPE integer USING CASE
  WHEN duration_ms::text = '' THEN NULL
  ELSE duration_ms
END;

ALTER TABLE song_suggestions
ALTER COLUMN bpm TYPE integer USING CASE
  WHEN bpm::text = '' THEN NULL
  ELSE bpm
END;
