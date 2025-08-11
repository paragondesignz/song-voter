-- Quick fix to ensure your user has a profile and can see data

-- Create profile for your user if it doesn't exist
INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
SELECT 
  'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc',
  (SELECT email FROM auth.users WHERE id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc'),
  'User',
  NOW(),
  NOW()
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Check if user is in any bands
SELECT 
  b.id,
  b.name,
  bm.user_id,
  bm.role
FROM public.bands b
LEFT JOIN public.band_members bm ON b.id = bm.band_id
WHERE bm.user_id = 'c53b14ff-3059-4dc7-99dd-4e7e7eb107dc';

-- If no bands, let's check all bands
SELECT * FROM public.bands LIMIT 5;

-- Check all band members
SELECT * FROM public.band_members LIMIT 10;