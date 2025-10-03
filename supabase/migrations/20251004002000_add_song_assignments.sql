-- Add song assignment feature for admins to assign songs to specific members

ALTER TABLE song_suggestions
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_song_suggestions_assigned_to ON song_suggestions(assigned_to);

-- Add comment for documentation
COMMENT ON COLUMN song_suggestions.assigned_to IS 'Admin-assigned member who should learn/practice this song';
