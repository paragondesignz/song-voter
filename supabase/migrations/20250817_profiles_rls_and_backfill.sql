-- Allow band members to view profiles of other members in the same bands
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Band members can view profiles in their bands'
  ) THEN
    CREATE POLICY "Band members can view profiles in their bands" ON profiles
      FOR SELECT USING (
        id IN (
          SELECT bm2.user_id
          FROM band_members bm2
          WHERE bm2.band_id IN (
            SELECT bm.band_id
            FROM band_members bm
            WHERE bm.user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Backfill missing profiles for band members from auth.users
INSERT INTO profiles (id, email, display_name)
SELECT u.id,
       COALESCE(u.email, concat(u.id::text, '@unknown.local')) AS email,
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Unknown User') AS display_name
FROM auth.users u
JOIN band_members bm ON bm.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;


