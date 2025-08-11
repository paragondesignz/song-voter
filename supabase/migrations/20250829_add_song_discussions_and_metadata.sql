-- Add song metadata fields
ALTER TABLE song_suggestions 
ADD COLUMN IF NOT EXISTS bpm INTEGER,
ADD COLUMN IF NOT EXISTS musical_key VARCHAR(10),
ADD COLUMN IF NOT EXISTS vocal_type VARCHAR(20) CHECK (vocal_type IN ('male', 'female', 'duet', 'instrumental'));

-- Create song discussions table
CREATE TABLE IF NOT EXISTS song_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song_suggestion_id UUID NOT NULL REFERENCES song_suggestions(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_id UUID REFERENCES song_discussions(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT FALSE
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_song_discussions_song_id ON song_discussions(song_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_song_discussions_band_id ON song_discussions(band_id);
CREATE INDEX IF NOT EXISTS idx_song_discussions_author_id ON song_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_song_discussions_parent_id ON song_discussions(parent_id);

-- Enable RLS
ALTER TABLE song_discussions ENABLE ROW LEVEL SECURITY;

-- RLS policies for song discussions
CREATE POLICY "Users can view discussions for songs in their bands" ON song_discussions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM band_members 
      WHERE band_members.band_id = song_discussions.band_id 
      AND band_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create discussions for songs in their bands" ON song_discussions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM band_members 
      WHERE band_members.band_id = song_discussions.band_id 
      AND band_members.user_id = auth.uid()
    )
    AND author_id = auth.uid()
  );

CREATE POLICY "Users can update their own discussions" ON song_discussions
  FOR UPDATE USING (
    author_id = auth.uid()
  ) WITH CHECK (
    author_id = auth.uid()
  );

CREATE POLICY "Users can delete their own discussions" ON song_discussions
  FOR DELETE USING (
    author_id = auth.uid()
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_song_discussion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_song_discussions_updated_at
  BEFORE UPDATE ON song_discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_song_discussion_updated_at();

-- Function to mark discussion as edited
CREATE OR REPLACE FUNCTION mark_discussion_edited()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark discussion as edited when content changes
CREATE TRIGGER mark_discussion_edited_trigger
  BEFORE UPDATE ON song_discussions
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION mark_discussion_edited();
