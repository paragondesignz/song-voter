-- Create song_comments table
CREATE TABLE song_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_suggestion_id UUID NOT NULL REFERENCES song_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_song_comments_song_suggestion_id ON song_comments(song_suggestion_id);
CREATE INDEX idx_song_comments_band_id ON song_comments(band_id);
CREATE INDEX idx_song_comments_created_at ON song_comments(created_at DESC);

-- Enable RLS
ALTER TABLE song_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Band members can view comments on songs in their bands
CREATE POLICY "Band members can view song comments"
  ON song_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = song_comments.band_id
      AND band_members.user_id = auth.uid()
    )
  );

-- Band members can create comments on songs in their bands
CREATE POLICY "Band members can create song comments"
  ON song_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = song_comments.band_id
      AND band_members.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM song_suggestions
      WHERE song_suggestions.id = song_comments.song_suggestion_id
      AND song_suggestions.band_id = song_comments.band_id
    )
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON song_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON song_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_song_comments_updated_at
  BEFORE UPDATE ON song_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
