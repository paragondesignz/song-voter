-- Enable RLS on vote_rate_limits table
ALTER TABLE vote_rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own rate limits" ON vote_rate_limits;
DROP POLICY IF EXISTS "Users can manage their own rate limits" ON vote_rate_limits;

-- Create RLS policies for vote_rate_limits table
-- Users can view their own rate limit data
CREATE POLICY "Users can view their own rate limits" ON vote_rate_limits
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert/update their own rate limit data
CREATE POLICY "Users can manage their own rate limits" ON vote_rate_limits
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());