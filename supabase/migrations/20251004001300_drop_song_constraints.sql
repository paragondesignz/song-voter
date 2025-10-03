-- Drop all CHECK constraints on song_suggestions that might be causing 400 errors

ALTER TABLE song_suggestions
DROP CONSTRAINT IF EXISTS song_suggestions_status_check;

ALTER TABLE song_suggestions
DROP CONSTRAINT IF EXISTS song_suggestions_vocal_type_check;

-- Re-add them as nullable/permissive
ALTER TABLE song_suggestions
ADD CONSTRAINT song_suggestions_status_check
CHECK (status IN ('suggested', 'in_rehearsal', 'practiced'));

-- Don't re-add vocal_type constraint - let it be free-form
