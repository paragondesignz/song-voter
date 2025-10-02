-- Create complete band posts system with posts, comments, and likes

-- Create band_posts table
CREATE TABLE band_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_announcement boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create band_post_likes table for tracking likes
CREATE TABLE band_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES band_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create band_post_comments table
CREATE TABLE band_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES band_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_band_posts_band_id ON band_posts(band_id);
CREATE INDEX idx_band_posts_author_id ON band_posts(author_id);
CREATE INDEX idx_band_posts_created_at ON band_posts(created_at DESC);
CREATE INDEX idx_band_posts_pinned ON band_posts(is_pinned, created_at DESC);

CREATE INDEX idx_band_post_likes_post_id ON band_post_likes(post_id);
CREATE INDEX idx_band_post_likes_user_id ON band_post_likes(user_id);

CREATE INDEX idx_band_post_comments_post_id ON band_post_comments(post_id);
CREATE INDEX idx_band_post_comments_author_id ON band_post_comments(author_id);
CREATE INDEX idx_band_post_comments_created_at ON band_post_comments(created_at);

-- Enable RLS on all tables
ALTER TABLE band_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_post_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for band_posts
CREATE POLICY "Band members can view posts" ON band_posts
  FOR SELECT
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can create posts" ON band_posts
  FOR INSERT
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can update their posts" ON band_posts
  FOR UPDATE
  USING (
    author_id = auth.uid() AND
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update any post" ON band_posts
  FOR UPDATE
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Post authors and admins can delete posts" ON band_posts
  FOR DELETE
  USING (
    (author_id = auth.uid() OR
     band_id IN (
       SELECT band_id FROM band_members
       WHERE user_id = auth.uid() AND role = 'admin'
     )) AND
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS policies for band_post_likes
CREATE POLICY "Band members can view likes" ON band_post_likes
  FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM band_posts
      WHERE band_id IN (
        SELECT band_id FROM band_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Band members can like posts" ON band_post_likes
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    post_id IN (
      SELECT id FROM band_posts
      WHERE band_id IN (
        SELECT band_id FROM band_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can unlike their own likes" ON band_post_likes
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for band_post_comments
CREATE POLICY "Band members can view comments" ON band_post_comments
  FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM band_posts
      WHERE band_id IN (
        SELECT band_id FROM band_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Band members can create comments" ON band_post_comments
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    post_id IN (
      SELECT id FROM band_posts
      WHERE band_id IN (
        SELECT band_id FROM band_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Comment authors can update their comments" ON band_post_comments
  FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Comment authors and admins can delete comments" ON band_post_comments
  FOR DELETE
  USING (
    author_id = auth.uid() OR
    post_id IN (
      SELECT id FROM band_posts
      WHERE band_id IN (
        SELECT band_id FROM band_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Function to update post counts when likes are added/removed
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE band_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE band_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post counts when comments are added/removed
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE band_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE band_posts
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update counts
CREATE TRIGGER update_post_likes_count_trigger
  AFTER INSERT OR DELETE ON band_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER update_post_comments_count_trigger
  AFTER INSERT OR DELETE ON band_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Function to get posts with user-specific data (liked status)
CREATE OR REPLACE FUNCTION get_band_posts_with_user_data(
  band_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
) RETURNS TABLE (
  id uuid,
  band_id uuid,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  title text,
  content text,
  is_pinned boolean,
  is_announcement boolean,
  likes_count integer,
  comments_count integer,
  user_has_liked boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.band_id,
    bp.author_id,
    p.display_name as author_name,
    p.avatar_url as author_avatar_url,
    bp.title,
    bp.content,
    bp.is_pinned,
    bp.is_announcement,
    bp.likes_count,
    bp.comments_count,
    EXISTS(
      SELECT 1 FROM band_post_likes bpl
      WHERE bpl.post_id = bp.id AND bpl.user_id = user_id_param
    ) as user_has_liked,
    bp.created_at,
    bp.updated_at
  FROM band_posts bp
  JOIN profiles p ON bp.author_id = p.id
  WHERE bp.band_id = band_id_param
  ORDER BY bp.is_pinned DESC, bp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comments for a post
CREATE OR REPLACE FUNCTION get_post_comments(
  post_id_param uuid
) RETURNS TABLE (
  id uuid,
  post_id uuid,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  content text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bpc.id,
    bpc.post_id,
    bpc.author_id,
    p.display_name as author_name,
    p.avatar_url as author_avatar_url,
    bpc.content,
    bpc.created_at,
    bpc.updated_at
  FROM band_post_comments bpc
  JOIN profiles p ON bpc.author_id = p.id
  WHERE bpc.post_id = post_id_param
  ORDER BY bpc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;