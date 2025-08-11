-- Enable UUID extension
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
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(band_id, spotify_track_id)
);
-- Create song_votes table
CREATE TABLE song_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  song_suggestion_id uuid REFERENCES song_suggestions(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text DEFAULT 'upvote',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(song_suggestion_id, voter_id)
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
-- Create materialized view for leaderboard
CREATE MATERIALIZED VIEW song_leaderboard AS
SELECT 
  ss.id,
  ss.band_id,
  ss.title,
  ss.artist,
  ss.album_art_url,
  ss.suggested_by,
  COUNT(sv.id) as vote_count,
  COUNT(CASE WHEN sv.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_votes,
  ss.created_at as suggested_at
FROM song_suggestions ss
LEFT JOIN song_votes sv ON ss.id = sv.song_suggestion_id
GROUP BY ss.id, ss.band_id, ss.title, ss.artist, ss.album_art_url, ss.suggested_by, ss.created_at;
-- Create function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_song_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW song_leaderboard;
END;
$$ LANGUAGE plpgsql;
-- Create indexes for performance
CREATE INDEX idx_band_members_band_id ON band_members(band_id);
CREATE INDEX idx_band_members_user_id ON band_members(user_id);
CREATE INDEX idx_song_suggestions_band_id ON song_suggestions(band_id);
CREATE INDEX idx_song_suggestions_suggested_by ON song_suggestions(suggested_by);
CREATE INDEX idx_song_votes_song_suggestion_id ON song_votes(song_suggestion_id);
CREATE INDEX idx_song_votes_voter_id ON song_votes(voter_id);
CREATE INDEX idx_song_leaderboard_band_id ON song_leaderboard(band_id);
CREATE INDEX idx_song_leaderboard_vote_count ON song_leaderboard(vote_count DESC);
-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_rate_limits ENABLE ROW LEVEL SECURITY;
-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
-- RLS Policies for bands
CREATE POLICY "Band members can view their bands" ON bands
  FOR SELECT USING (
    id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (created_by = auth.uid());
-- RLS Policies for band_members
CREATE POLICY "Band members can view members of their bands" ON band_members
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Band admins can manage members" ON band_members
  FOR ALL USING (
    band_id IN (
      SELECT band_id FROM band_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
-- RLS Policies for song_suggestions
CREATE POLICY "Band members can view their band's songs" ON song_suggestions
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Band members can suggest songs" ON song_suggestions
  FOR INSERT WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
    AND suggested_by = auth.uid()
  );
-- RLS Policies for song_votes
CREATE POLICY "Band members can view votes" ON song_votes
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Members can vote on songs (not their own)" ON song_votes
  FOR INSERT WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
    AND voter_id = auth.uid()
    AND song_suggestion_id NOT IN (
      SELECT id FROM song_suggestions WHERE suggested_by = auth.uid()
    )
  );
CREATE POLICY "Members can update their own votes" ON song_votes
  FOR UPDATE USING (voter_id = auth.uid());
CREATE POLICY "Members can delete their own votes" ON song_votes
  FOR DELETE USING (voter_id = auth.uid());
-- RLS Policies for rehearsals
CREATE POLICY "Band members can view rehearsals" ON rehearsals
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Band admins can manage rehearsals" ON rehearsals
  FOR ALL USING (
    band_id IN (
      SELECT band_id FROM band_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
-- RLS Policies for rehearsal_setlists
CREATE POLICY "Band members can view setlists" ON rehearsal_setlists
  FOR SELECT USING (
    rehearsal_id IN (
      SELECT id FROM rehearsals WHERE band_id IN (
        SELECT band_id FROM band_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Band admins can manage setlists" ON rehearsal_setlists
  FOR ALL USING (
    rehearsal_id IN (
      SELECT id FROM rehearsals WHERE band_id IN (
        SELECT band_id FROM band_members 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );
-- RLS Policy for vote_rate_limits
CREATE POLICY "Users can manage their own rate limits" ON vote_rate_limits
  FOR ALL USING (user_id = auth.uid());
-- Function to handle user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
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
