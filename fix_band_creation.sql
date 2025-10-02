-- Fix Band Creation RLS Policies
-- This will completely reset the policies to ensure band creation works

-- First, disable RLS temporarily to clean up
ALTER TABLE bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on bands table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view bands" ON bands;
DROP POLICY IF EXISTS "Authenticated users can create bands" ON bands;
DROP POLICY IF EXISTS "Band admins can update bands" ON bands;
DROP POLICY IF EXISTS "Anyone can view band members" ON band_members;
DROP POLICY IF EXISTS "Users can join bands" ON band_members;
DROP POLICY IF EXISTS "Users can create band memberships" ON band_members;
DROP POLICY IF EXISTS "Admins can manage members" ON band_members;
DROP POLICY IF EXISTS "Admins can remove members" ON band_members;
DROP POLICY IF EXISTS "Users can leave or admins can remove members" ON band_members;

-- Re-enable RLS
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies for bands
CREATE POLICY "Enable read access for all users" ON bands
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON bands
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for band admins" ON bands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM band_members
      WHERE band_members.band_id = bands.id
      AND band_members.user_id = auth.uid()
      AND band_members.role = 'admin'
    )
  );

CREATE POLICY "Enable delete for band creators" ON bands
  FOR DELETE USING (auth.uid() = created_by);

-- Create PERMISSIVE policies for band_members
CREATE POLICY "Enable read access for all users" ON band_members
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON band_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for band admins" ON band_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

CREATE POLICY "Enable delete for self or admins" ON band_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_members.band_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
    )
  );

-- Ensure the set_invite_code function exists
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the generate_invite_code function exists
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS bands_invite_code_trigger ON bands;
CREATE TRIGGER bands_invite_code_trigger
  BEFORE INSERT ON bands
  FOR EACH ROW EXECUTE FUNCTION set_invite_code();

-- Grant necessary permissions
GRANT ALL ON bands TO authenticated;
GRANT ALL ON band_members TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION set_invite_code() TO authenticated;