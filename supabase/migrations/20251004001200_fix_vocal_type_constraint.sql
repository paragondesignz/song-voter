-- Fix vocal_type constraint - might have invalid data or constraint is too strict
-- Drop the constraint and make it nullable to avoid 400 errors

-- Drop the existing constraint
ALTER TABLE song_suggestions
DROP CONSTRAINT IF EXISTS song_suggestions_vocal_type_check;

-- Re-add the constraint but allow NULL
ALTER TABLE song_suggestions
ADD CONSTRAINT song_suggestions_vocal_type_check
CHECK (vocal_type IS NULL OR vocal_type IN ('male', 'female', 'duet', 'instrumental'));
