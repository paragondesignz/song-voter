-- Fix missing user profile and band membership for mark@paragondesign.co.nz
-- This ensures the user has a proper profile and is added as admin to bands they created

-- First, get the user ID for mark@paragondesign.co.nz from auth.users
-- Then ensure they have a profile and are added to their bands

DO $$
DECLARE
    user_id_var uuid;
    band_record RECORD;
BEGIN
    -- Get the user ID for mark@paragondesign.co.nz
    SELECT id INTO user_id_var
    FROM auth.users
    WHERE email = 'mark@paragondesign.co.nz'
    LIMIT 1;

    -- If user exists, ensure they have a profile
    IF user_id_var IS NOT NULL THEN
        -- Insert profile if it doesn't exist
        INSERT INTO profiles (id, display_name, email)
        VALUES (
            user_id_var,
            'Mark Steven',
            'mark@paragondesign.co.nz'
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = COALESCE(profiles.display_name, 'Mark Steven'),
            email = COALESCE(profiles.email, 'mark@paragondesign.co.nz');

        -- Add user as admin to any bands they created but aren't a member of
        FOR band_record IN
            SELECT id FROM bands
            WHERE created_by = user_id_var
            AND id NOT IN (
                SELECT band_id FROM band_members
                WHERE user_id = user_id_var
            )
        LOOP
            INSERT INTO band_members (band_id, user_id, role, joined_at)
            VALUES (band_record.id, user_id_var, 'admin', NOW());
        END LOOP;

        RAISE NOTICE 'Fixed profile and band membership for mark@paragondesign.co.nz (ID: %)', user_id_var;
    ELSE
        RAISE NOTICE 'User mark@paragondesign.co.nz not found in auth.users';
    END IF;
END $$;