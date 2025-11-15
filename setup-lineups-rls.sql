-- Setup Row Level Security for Lineups Table
-- Run this in Supabase SQL Editor

-- Enable RLS on lineups table
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view lineups" ON lineups;
DROP POLICY IF EXISTS "Coaches and admins can create lineups" ON lineups;
DROP POLICY IF EXISTS "Coaches and admins can update lineups" ON lineups;
DROP POLICY IF EXISTS "Creator and admins can delete lineups" ON lineups;

-- ============================================
-- SELECT POLICIES
-- ============================================

-- Policy 1: Everyone can view all lineups
CREATE POLICY "Anyone can view lineups"
  ON lineups
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- INSERT POLICIES
-- ============================================

-- Policy 2: Coaches, captains, and admins can create lineups
CREATE POLICY "Coaches and admins can create lineups"
  ON lineups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'captain')
    )
  );

-- ============================================
-- UPDATE POLICIES
-- ============================================

-- Policy 3: Coaches and admins can update any lineup
-- Creator can also update their own lineup
CREATE POLICY "Coaches and admins can update lineups"
  ON lineups
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- ============================================
-- DELETE POLICIES
-- ============================================

-- Policy 4: Creator and admins can delete lineups
CREATE POLICY "Creator and admins can delete lineups"
  ON lineups
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the policies were created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'lineups'
ORDER BY policyname;
