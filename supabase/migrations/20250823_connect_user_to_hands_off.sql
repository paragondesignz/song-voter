-- Connect user to their existing "Hands Off" band

-- First, let's check what bands exist
DO $$
DECLARE
  hands_off_id UUID;
  target_user_id UUID := 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';
BEGIN
  -- Find the Hands Off band
  SELECT id INTO hands_off_id FROM public.bands WHERE name = 'Hands Off' LIMIT 1;
  
  IF hands_off_id IS NOT NULL THEN
    -- Ensure user is a member of Hands Off band
    INSERT INTO public.band_members (band_id, user_id, role, joined_at)
    VALUES (hands_off_id, target_user_id, 'admin', NOW())
    ON CONFLICT (band_id, user_id) 
    DO UPDATE SET role = 'admin', joined_at = COALESCE(band_members.joined_at, NOW());
    
    RAISE NOTICE 'Connected user % to Hands Off band %', target_user_id, hands_off_id;
  ELSE
    -- Create the Hands Off band if it doesn't exist
    INSERT INTO public.bands (name, created_by, invite_code)
    VALUES ('Hands Off', target_user_id, 'HANDSOFF')
    RETURNING id INTO hands_off_id;
    
    -- Add user as admin
    INSERT INTO public.band_members (band_id, user_id, role, joined_at)
    VALUES (hands_off_id, target_user_id, 'admin', NOW());
    
    RAISE NOTICE 'Created Hands Off band % and added user % as admin', hands_off_id, target_user_id;
  END IF;
  
  -- Clean up any duplicate test bands
  DELETE FROM public.bands 
  WHERE name = 'My First Band' 
  AND created_by = target_user_id
  AND id NOT IN (
    SELECT bm.band_id FROM public.band_members bm WHERE bm.user_id = target_user_id
  );
END $$;

-- Verify the connection
DO $$
DECLARE
  band_count INTEGER;
  band_names TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(b.name, ', ')
  INTO band_count, band_names
  FROM public.band_members bm
  JOIN public.bands b ON b.id = bm.band_id
  WHERE bm.user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';
  
  RAISE NOTICE 'User is member of % bands: %', band_count, band_names;
END $$;