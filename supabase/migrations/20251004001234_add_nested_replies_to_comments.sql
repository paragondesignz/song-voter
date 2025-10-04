-- Add parent_id column to support nested replies
ALTER TABLE song_comments
ADD COLUMN parent_id UUID REFERENCES song_comments(id) ON DELETE CASCADE;

-- Create index for parent_id lookups
CREATE INDEX idx_song_comments_parent_id ON song_comments(parent_id);
