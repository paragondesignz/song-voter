-- Test script to verify voting functionality
-- This will be removed after testing

-- Check if the user mark@paragondesign.co.nz exists and can vote
DO $$
DECLARE
    user_uuid uuid;
    band_uuid uuid;
    song_uuid uuid;
BEGIN
    -- Find user by email
    SELECT id INTO user_uuid 
    FROM profiles 
    WHERE email = 'mark@paragondesign.co.nz';
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'User mark@paragondesign.co.nz not found in profiles table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user: %', user_uuid;
    
    -- Find a band this user belongs to
    SELECT band_id INTO band_uuid
    FROM band_members 
    WHERE user_id = user_uuid 
    LIMIT 1;
    
    IF band_uuid IS NULL THEN
        RAISE NOTICE 'User is not a member of any bands';
        RETURN;
    END IF;
    
    RAISE NOTICE 'User is member of band: %', band_uuid;
    
    -- Find a song suggestion in this band
    SELECT id INTO song_uuid
    FROM song_suggestions 
    WHERE band_id = band_uuid 
    LIMIT 1;
    
    IF song_uuid IS NULL THEN
        RAISE NOTICE 'No song suggestions found in band';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found song: %', song_uuid;
    RAISE NOTICE 'All voting prerequisites exist - user can vote on songs';
    
END $$;
