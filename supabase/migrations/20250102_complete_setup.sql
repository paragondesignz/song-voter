-- Rehearsalist Database Setup for Supabase
-- Run this SQL in your Supabase SQL Editor after creating a new project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create bands table
CREATE TABLE bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  shared_password text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Create band_members table
CREATE TABLE band_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(band_id, user_id)
);

-- Create song_suggestions table
CREATE TABLE song_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  suggested_by uuid REFERENCES profiles(id),
  spotify_track_id text,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  duration_ms integer,
  album_art_url text,
  preview_url text,
  notes text,
  status text DEFAULT 'suggested' CHECK (status IN ('suggested', 'in_rehearsal', 'practiced')),
  star_rating numeric(2,1) DEFAULT 0 CHECK (star_rating >= 0 AND star_rating <= 5),
  total_stars numeric DEFAULT 0,
  total_ratings integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(band_id, spotify_track_id)
);

-- Create song_votes table
CREATE TABLE song_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  song_suggestion_id uuid REFERENCES song_suggestions(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text DEFAULT 'upvote' CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(song_suggestion_id, voter_id)
);

-- Create song_ratings table for star ratings
CREATE TABLE song_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_suggestion_id uuid REFERENCES song_suggestions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating numeric(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(song_suggestion_id, user_id)
);

-- Create rehearsals table
CREATE TABLE rehearsals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  rehearsal_date date NOT NULL,
  start_time time,
  location text,
  songs_to_learn integer NOT NULL CHECK (songs_to_learn >= 1 AND songs_to_learn <= 10),
  selection_deadline timestamp with time zone,
  description text,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'songs_selected', 'completed')),
  created_at timestamp with time zone DEFAULT now()
);

-- Create rehearsal_setlists table
CREATE TABLE rehearsal_setlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id uuid REFERENCES rehearsals(id) ON DELETE CASCADE,
  song_suggestion_id uuid REFERENCES song_suggestions(id),
  selection_reason text,
  position integer NOT NULL,
  vote_count_at_selection integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Create vote_rate_limits table
CREATE TABLE vote_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  band_id uuid REFERENCES bands(id),
  vote_count integer DEFAULT 0,
  window_start timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, band_id)
);

-- Create song discussions table
CREATE TABLE song_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_suggestion_id uuid REFERENCES song_suggestions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create song_metadata table for additional details
CREATE TABLE song_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_suggestion_id uuid REFERENCES song_suggestions(id) ON DELETE CASCADE UNIQUE,
  genre text,
  tempo integer,
  key text,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  lyrics_url text,
  tabs_url text,
  video_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create materialized view for leaderboard
CREATE MATERIALIZED VIEW song_leaderboard AS
SELECT
  ss.id,
  ss.band_id,
  ss.title,
  ss.artist,
  ss.album_art_url,
  ss.suggested_by,
  ss.star_rating,
  ss.total_stars,
  ss.total_ratings,
  COALESCE(
    SUM(CASE WHEN sv.vote_type = 'upvote' THEN 1 ELSE 0 END) -
    SUM(CASE WHEN sv.vote_type = 'downvote' THEN 1 ELSE 0 END), 0
  ) as vote_score,
  SUM(CASE WHEN sv.vote_type = 'upvote' THEN 1 ELSE 0 END) as upvotes,
  SUM(CASE WHEN sv.vote_type = 'downvote' THEN 1 ELSE 0 END) as downvotes,
  COUNT(CASE WHEN sv.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_votes,
  ss.created_at as suggested_at
FROM song_suggestions ss
LEFT JOIN song_votes sv ON ss.id = sv.song_suggestion_id
GROUP BY ss.id, ss.band_id, ss.title, ss.artist, ss.album_art_url, ss.suggested_by,
         ss.star_rating, ss.total_stars, ss.total_ratings, ss.created_at;

-- Create indexes for performance
CREATE INDEX idx_band_members_band_id ON band_members(band_id);
CREATE INDEX idx_band_members_user_id ON band_members(user_id);
CREATE INDEX idx_song_suggestions_band_id ON song_suggestions(band_id);
CREATE INDEX idx_song_suggestions_suggested_by ON song_suggestions(suggested_by);
CREATE INDEX idx_song_votes_song_suggestion_id ON song_votes(song_suggestion_id);
CREATE INDEX idx_song_votes_voter_id ON song_votes(voter_id);
CREATE INDEX idx_song_ratings_song_suggestion_id ON song_ratings(song_suggestion_id);
CREATE INDEX idx_song_ratings_user_id ON song_ratings(user_id);
CREATE INDEX idx_song_leaderboard_band_id ON song_leaderboard(band_id);
CREATE INDEX idx_song_leaderboard_vote_score ON song_leaderboard(vote_score DESC);
CREATE INDEX idx_rehearsal_setlists_rehearsal_id ON rehearsal_setlists(rehearsal_id);
CREATE INDEX idx_song_discussions_song_id ON song_discussions(song_suggestion_id);

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_song_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW song_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Function to handle user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM bands WHERE invite_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite codes
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bands_invite_code_trigger
  BEFORE INSERT ON bands
  FOR EACH ROW EXECUTE FUNCTION set_invite_code();

-- Function to update star ratings
CREATE OR REPLACE FUNCTION update_song_star_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE song_suggestions
  SET
    total_stars = COALESCE((
      SELECT SUM(rating) FROM song_ratings
      WHERE song_suggestion_id = NEW.song_suggestion_id
    ), 0),
    total_ratings = COALESCE((
      SELECT COUNT(*) FROM song_ratings
      WHERE song_suggestion_id = NEW.song_suggestion_id
    ), 0),
    star_rating = CASE
      WHEN COALESCE((
        SELECT COUNT(*) FROM song_ratings
        WHERE song_suggestion_id = NEW.song_suggestion_id
      ), 0) > 0 THEN
        ROUND(COALESCE((
          SELECT AVG(rating) FROM song_ratings
          WHERE song_suggestion_id = NEW.song_suggestion_id
        ), 0)::numeric, 1)
      ELSE 0
    END
  WHERE id = NEW.song_suggestion_id;

  REFRESH MATERIALIZED VIEW song_leaderboard;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for star rating updates
CREATE TRIGGER update_star_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON song_ratings
FOR EACH ROW EXECUTE FUNCTION update_song_star_rating();

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_metadata ENABLE ROW LEVEL SECURITY;

-- Create simplified RLS policies (avoiding recursion)
-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Bands policies
CREATE POLICY "Anyone can view bands"
  ON bands FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create bands"
  ON bands FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Band admins can update bands"
  ON bands FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = bands.id
      AND band_members.user_id = auth.uid()
      AND band_members.role = 'admin'
    )
  );

-- Band members policies
CREATE POLICY "Anyone can view band members"
  ON band_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join bands"
  ON band_members FOR INSERT
  WITH CHECK (auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage members"
  ON band_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

CREATE POLICY "Admins can remove members"
  ON band_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- Song suggestions policies
CREATE POLICY "Anyone can view songs"
  ON song_suggestions FOR SELECT
  USING (true);

CREATE POLICY "Band members can suggest songs"
  ON song_suggestions FOR INSERT
  WITH CHECK (
    auth.uid() = suggested_by AND
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = song_suggestions.band_id
      AND band_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Song suggesters can update their songs"
  ON song_suggestions FOR UPDATE
  USING (auth.uid() = suggested_by);

CREATE POLICY "Admins and suggesters can delete songs"
  ON song_suggestions FOR DELETE
  USING (
    auth.uid() = suggested_by OR
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = song_suggestions.band_id
      AND band_members.user_id = auth.uid()
      AND band_members.role = 'admin'
    )
  );

-- Song votes policies
CREATE POLICY "Anyone can view votes"
  ON song_votes FOR SELECT
  USING (true);

CREATE POLICY "Band members can vote"
  ON song_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = song_votes.band_id
      AND band_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own votes"
  ON song_votes FOR UPDATE
  USING (auth.uid() = voter_id);

CREATE POLICY "Users can delete own votes"
  ON song_votes FOR DELETE
  USING (auth.uid() = voter_id);

-- Song ratings policies
CREATE POLICY "Anyone can view ratings"
  ON song_ratings FOR SELECT
  USING (true);

CREATE POLICY "Band members can rate songs"
  ON song_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM song_suggestions ss
      JOIN band_members bm ON bm.band_id = ss.band_id
      WHERE ss.id = song_ratings.song_suggestion_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ratings"
  ON song_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON song_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Rehearsals policies
CREATE POLICY "Anyone can view rehearsals"
  ON rehearsals FOR SELECT
  USING (true);

CREATE POLICY "Band admins can manage rehearsals"
  ON rehearsals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = rehearsals.band_id
      AND band_members.user_id = auth.uid()
      AND band_members.role = 'admin'
    )
  );

-- Rehearsal setlists policies
CREATE POLICY "Anyone can view setlists"
  ON rehearsal_setlists FOR SELECT
  USING (true);

CREATE POLICY "Band admins can manage setlists"
  ON rehearsal_setlists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rehearsals r
      JOIN band_members bm ON bm.band_id = r.band_id
      WHERE r.id = rehearsal_setlists.rehearsal_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- Vote rate limits policies
CREATE POLICY "Users manage own rate limits"
  ON vote_rate_limits FOR ALL
  USING (auth.uid() = user_id);

-- Song discussions policies
CREATE POLICY "Anyone can view discussions"
  ON song_discussions FOR SELECT
  USING (true);

CREATE POLICY "Band members can post discussions"
  ON song_discussions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM song_suggestions ss
      JOIN band_members bm ON bm.band_id = ss.band_id
      WHERE ss.id = song_discussions.song_suggestion_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own discussions"
  ON song_discussions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own discussions"
  ON song_discussions FOR DELETE
  USING (auth.uid() = user_id);

-- Song metadata policies
CREATE POLICY "Anyone can view metadata"
  ON song_metadata FOR SELECT
  USING (true);

CREATE POLICY "Band members can manage metadata"
  ON song_metadata FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM song_suggestions ss
      JOIN band_members bm ON bm.band_id = ss.band_id
      WHERE ss.id = song_metadata.song_suggestion_id
      AND bm.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW song_leaderboard;