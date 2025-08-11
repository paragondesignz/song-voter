-- Simple fix: Just ensure the membership exists

-- Delete any existing membership to avoid conflicts
DELETE FROM public.band_members 
WHERE user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';

-- Insert the membership
INSERT INTO public.band_members (band_id, user_id, role, joined_at)
VALUES (
  '6ea8b825-ec5d-4fe5-9858-9c92cfcae91f',  -- Known Hands Off band ID
  'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc',  -- User ID
  'admin',
  NOW()
);

-- Verify it worked
DO $$
DECLARE
  membership_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO membership_count 
  FROM public.band_members 
  WHERE user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';
  
  RAISE NOTICE 'Membership count after insert: %', membership_count;
  
  IF membership_count = 0 THEN
    RAISE WARNING 'FAILED: Still no membership found!';
  ELSE
    RAISE NOTICE 'SUCCESS: % membership(s) found', membership_count;
  END IF;
END $$;