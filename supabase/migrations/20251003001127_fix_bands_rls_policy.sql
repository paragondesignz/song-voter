-- Fix bands table RLS policy that's blocking band creation

-- Drop the existing problematic bands policies
DROP POLICY IF EXISTS "Band members can view their bands" ON bands;
DROP POLICY IF EXISTS "Users can create bands" ON bands;

-- Create simpler bands policies that don't cause recursion or auth issues

-- Policy 1: Authenticated users can view all bands (safe for collaborative app)
CREATE POLICY "Authenticated users can view bands" ON bands
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy 2: Authenticated users can create bands
CREATE POLICY "Authenticated users can create bands" ON bands
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Band creators can update their bands
CREATE POLICY "Band creators can update bands" ON bands
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy 4: Band creators can delete their bands
CREATE POLICY "Band creators can delete bands" ON bands
  FOR DELETE USING (created_by = auth.uid());