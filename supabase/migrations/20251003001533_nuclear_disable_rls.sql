-- NUCLEAR OPTION: Completely disable RLS to test if it's the root cause
-- This is a temporary diagnostic measure

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow all authenticated operations on bands" ON bands;
DROP POLICY IF EXISTS "Authenticated users can view band members" ON band_members;
DROP POLICY IF EXISTS "Authenticated users can join bands" ON band_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON band_members;
DROP POLICY IF EXISTS "Users can leave bands" ON band_members;

-- Completely disable RLS on both tables
ALTER TABLE bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_members DISABLE ROW LEVEL SECURITY;

-- This removes ALL access restrictions on these tables
-- WARNING: This is only for testing - re-enable RLS later with proper policies