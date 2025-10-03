-- EMERGENCY FIX: Critical Database Issues
-- This migration addresses CRITICAL security and functionality issues found in database audit
--
-- Issues Fixed:
-- 1. CRITICAL: Missing song_ratings table (code expects table, but only view exists)
-- 2. CRITICAL: RLS completely disabled on bands and band_members tables (SECURITY RISK)
-- 3. CRITICAL: Missing band settings columns that TypeScript interfaces expect
-- 4. HIGH: Restore proper access control with RLS policies

-- =================================================================
-- 1. CREATE MISSING SONG_RATINGS TABLE
-- =================================================================
-- The application expects a real table for INSERT/UPDATE/DELETE operations
-- but only a view was created, causing all rating functionality to fail

-- First, drop dependent objects and the view
DROP MATERIALIZED VIEW IF EXISTS song_leaderboard CASCADE;
DROP VIEW IF EXISTS song_ratings CASCADE;

-- Now create the actual table
CREATE TABLE IF NOT EXISTS song_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_suggestion_id UUID NOT NULL REFERENCES song_suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(song_suggestion_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_song_ratings_song_suggestion_id ON song_ratings(song_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_user_id ON song_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_rating ON song_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_song_ratings_created_at ON song_ratings(created_at);

-- Enable RLS on song_ratings table
ALTER TABLE song_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for song_ratings
-- Users can view all ratings (for leaderboards and analytics)
CREATE POLICY "Users can view all song ratings" ON song_ratings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own ratings
CREATE POLICY "Users can create their own ratings" ON song_ratings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings" ON song_ratings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON song_ratings
  FOR DELETE USING (user_id = auth.uid());

-- =================================================================
-- 2. ADD MISSING BAND SETTINGS COLUMNS
-- =================================================================
-- TypeScript Band interface expects these columns but they don't exist in database

ALTER TABLE bands ADD COLUMN IF NOT EXISTS voting_deadline_hours INTEGER DEFAULT 24;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS max_songs_per_rehearsal INTEGER DEFAULT 5;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS allow_member_song_suggestions BOOLEAN DEFAULT true;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS auto_select_songs BOOLEAN DEFAULT false;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"new_song_suggestions": true, "rehearsal_reminders": true, "voting_deadlines": true, "member_updates": true}'::jsonb;

-- =================================================================
-- 3. RE-ENABLE RLS ON CRITICAL TABLES (SECURITY FIX)
-- =================================================================
-- Previous migration disabled RLS entirely, creating a MASSIVE security hole
-- Any authenticated user could access/modify ANY band or member data

-- Re-enable RLS on bands table
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on band_members table
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 4. CREATE PROPER RLS POLICIES FOR BANDS
-- =================================================================

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "Members can view their bands" ON bands;
DROP POLICY IF EXISTS "Band creators can manage their bands" ON bands;
DROP POLICY IF EXISTS "Admins can update band settings" ON bands;

-- Policy: Users can view bands they are members of
CREATE POLICY "Members can view their bands" ON bands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = bands.id
      AND band_members.user_id = auth.uid()
    )
  );

-- Policy: Band creators and admins can update band settings
CREATE POLICY "Admins can update band settings" ON bands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = bands.id
      AND band_members.user_id = auth.uid()
      AND band_members.role = 'admin'
    )
  );

-- Policy: Authenticated users can create bands (they become admin automatically)
CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- =================================================================
-- 5. CREATE PROPER RLS POLICIES FOR BAND_MEMBERS
-- =================================================================

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "Members can view band membership" ON band_members;
DROP POLICY IF EXISTS "Admins can manage members" ON band_members;
DROP POLICY IF EXISTS "Users can join bands" ON band_members;

-- Policy: Users can view members of bands they belong to
CREATE POLICY "Members can view band membership" ON band_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM band_members bm2
      WHERE bm2.band_id = band_members.band_id
      AND bm2.user_id = auth.uid()
    )
  );

-- Policy: Admins can manage band membership (add/remove members, change roles)
CREATE POLICY "Admins can manage members" ON band_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM band_members bm2
      WHERE bm2.band_id = band_members.band_id
      AND bm2.user_id = auth.uid()
      AND bm2.role = 'admin'
    )
  );

-- Policy: Users can join bands (for invite functionality)
CREATE POLICY "Users can join bands" ON band_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =================================================================
-- 6. UPDATE EXISTING DATA TO MATCH NEW SCHEMA
-- =================================================================

-- Set default values for existing bands that now have new columns
UPDATE bands
SET
  voting_deadline_hours = COALESCE(voting_deadline_hours, 24),
  max_songs_per_rehearsal = COALESCE(max_songs_per_rehearsal, 5),
  allow_member_song_suggestions = COALESCE(allow_member_song_suggestions, true),
  auto_select_songs = COALESCE(auto_select_songs, false),
  notification_preferences = COALESCE(
    notification_preferences,
    '{"new_song_suggestions": true, "rehearsal_reminders": true, "voting_deadlines": true, "member_updates": true}'::jsonb
  )
WHERE voting_deadline_hours IS NULL
   OR max_songs_per_rehearsal IS NULL
   OR allow_member_song_suggestions IS NULL
   OR auto_select_songs IS NULL
   OR notification_preferences IS NULL;

-- =================================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to song_ratings table
DROP TRIGGER IF EXISTS update_song_ratings_updated_at ON song_ratings;
CREATE TRIGGER update_song_ratings_updated_at
    BEFORE UPDATE ON song_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- 8. RECREATE SONG_LEADERBOARD MATERIALIZED VIEW
-- =================================================================
-- Since we dropped the song_leaderboard view, we need to recreate it
-- This view is used for performance optimization in leaderboard queries

CREATE MATERIALIZED VIEW song_leaderboard AS
SELECT
    ss.id,
    ss.band_id,
    ss.title,
    ss.artist,
    ss.album,
    ss.album_art_url,
    ss.spotify_track_id,
    ss.suggested_by,
    ss.created_at,
    ss.status,
    p.display_name as suggested_by_name,
    p.avatar_url as suggested_by_avatar,
    COALESCE(rating_stats.avg_rating, 0) as average_rating,
    COALESCE(rating_stats.total_ratings, 0) as total_ratings,
    COALESCE(rating_stats.avg_rating, 0) * COALESCE(rating_stats.total_ratings, 0) as weighted_score
FROM song_suggestions ss
LEFT JOIN profiles p ON ss.suggested_by = p.id
LEFT JOIN (
    SELECT
        song_suggestion_id,
        AVG(rating::numeric) as avg_rating,
        COUNT(*) as total_ratings
    FROM song_ratings
    GROUP BY song_suggestion_id
) rating_stats ON ss.id = rating_stats.song_suggestion_id
WHERE ss.status != 'practiced';

-- Create indexes for the materialized view
CREATE INDEX IF NOT EXISTS idx_song_leaderboard_band_id ON song_leaderboard(band_id);
CREATE INDEX IF NOT EXISTS idx_song_leaderboard_weighted_score ON song_leaderboard(weighted_score DESC);
CREATE INDEX IF NOT EXISTS idx_song_leaderboard_average_rating ON song_leaderboard(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_song_leaderboard_total_ratings ON song_leaderboard(total_ratings DESC);

-- =================================================================
-- VERIFICATION QUERIES (for testing after migration)
-- =================================================================

-- Uncomment these lines to verify the migration worked:
-- SELECT 'song_ratings table exists' as check, count(*) as result FROM song_ratings;
-- SELECT 'bands has new columns' as check, voting_deadline_hours, max_songs_per_rehearsal FROM bands LIMIT 1;
-- SELECT 'RLS enabled on bands' as check, relrowsecurity FROM pg_class WHERE relname = 'bands';
-- SELECT 'RLS enabled on band_members' as check, relrowsecurity FROM pg_class WHERE relname = 'band_members';
-- SELECT 'song_leaderboard recreated' as check, count(*) as result FROM song_leaderboard;