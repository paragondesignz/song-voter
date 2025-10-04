-- Disable RLS on song_comments table to match other tables in the database
-- This is consistent with the current database state where RLS is disabled
-- on most tables to avoid recursion issues

ALTER TABLE song_comments DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Band members can view song comments" ON song_comments;
DROP POLICY IF EXISTS "Band members can create song comments" ON song_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON song_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON song_comments;
