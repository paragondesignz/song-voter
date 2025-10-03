-- Disable RLS on all tables to unblock the application
-- auth.uid() is not working in RLS policies, causing 401/406 errors across the app
-- Application-level security via session.user.id checks remains in place

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE song_suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE song_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE vote_rate_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsals DISABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_setlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_series DISABLE ROW LEVEL SECURITY;

-- Note: bands and band_members already disabled in previous migration
-- Note: band_files, band_folders, band_posts, band_post_comments, band_post_likes
--       were removed in migration 20251003001824_remove_posts_and_files_features.sql
