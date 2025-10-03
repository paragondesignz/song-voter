-- Fix profiles table access and ensure data is correct
-- This addresses the "Unknown User" issue by ensuring RLS allows profile access
-- and verifying the profile data exists

-- First, check if profiles table has proper RLS policies
-- The original migration had restrictive policies that might be blocking access

-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create more permissive policies for profiles (needed for band member display)
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Ensure mark@paragondesign.co.nz profile exists with correct data
DO $$
DECLARE
    user_id_var uuid;
BEGIN
    -- Get the user ID for mark@paragondesign.co.nz
    SELECT id INTO user_id_var
    FROM auth.users
    WHERE email = 'mark@paragondesign.co.nz'
    LIMIT 1;

    -- If user exists, ensure profile has correct data
    IF user_id_var IS NOT NULL THEN
        INSERT INTO profiles (id, display_name, email)
        VALUES (
            user_id_var,
            'Mark Steven',
            'mark@paragondesign.co.nz'
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = 'Mark Steven',
            email = 'mark@paragondesign.co.nz';

        RAISE NOTICE 'Profile ensured for mark@paragondesign.co.nz (ID: %)', user_id_var;
    ELSE
        RAISE NOTICE 'User mark@paragondesign.co.nz not found in auth.users';
    END IF;
END $$;