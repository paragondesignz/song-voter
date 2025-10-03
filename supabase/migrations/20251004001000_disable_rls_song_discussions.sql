-- Disable RLS on song_discussions table
-- This table also has RLS policies that won't work with auth.uid() issues

ALTER TABLE song_discussions DISABLE ROW LEVEL SECURITY;
