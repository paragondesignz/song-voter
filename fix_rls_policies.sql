-- Fix RLS Policies for Rehearsalist App

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view bands" ON bands;
DROP POLICY IF EXISTS "Authenticated users can create bands" ON bands;
DROP POLICY IF EXISTS "Band admins can update bands" ON bands;
DROP POLICY IF EXISTS "Anyone can view band members" ON band_members;
DROP POLICY IF EXISTS "Users can join bands" ON band_members;
DROP POLICY IF EXISTS "Admins can manage members" ON band_members;
DROP POLICY IF EXISTS "Admins can remove members" ON band_members;

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

-- Bands policies - FIXED for creation
CREATE POLICY "Anyone can view bands"
  ON bands FOR SELECT
  USING (true);

-- This is the key fix - authenticated users can create bands
CREATE POLICY "Authenticated users can create bands"
  ON bands FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

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

-- Band members policies - FIXED for initial member creation
CREATE POLICY "Anyone can view band members"
  ON band_members FOR SELECT
  USING (true);

-- Allow users to create the initial admin member when creating a band
CREATE POLICY "Users can create band memberships"
  ON band_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- User is adding themselves
      auth.uid() = user_id
      OR
      -- User is already an admin of this band
      EXISTS (
        SELECT 1 FROM band_members bm
        WHERE bm.band_id = band_members.band_id
        AND bm.user_id = auth.uid()
        AND bm.role = 'admin'
      )
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

CREATE POLICY "Users can leave or admins can remove members"
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

-- Ensure the invite code generation function exists
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

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS bands_invite_code_trigger ON bands;
CREATE TRIGGER bands_invite_code_trigger
  BEFORE INSERT ON bands
  FOR EACH ROW EXECUTE FUNCTION set_invite_code();