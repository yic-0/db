-- Setup Row Level Security for Practices and RSVPs
-- Run this in Supabase SQL Editor

-- ============================================
-- PRACTICES TABLE RLS
-- ============================================

-- Enable RLS on practices table
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view practices" ON practices;
DROP POLICY IF EXISTS "Admins and coaches can create practices" ON practices;
DROP POLICY IF EXISTS "Admins and coaches can update practices" ON practices;
DROP POLICY IF EXISTS "Admins can delete practices" ON practices;

-- Policy 1: Everyone can view practices
CREATE POLICY "Anyone can view practices"
  ON practices
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Admins and coaches can create practices
CREATE POLICY "Admins and coaches can create practices"
  ON practices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- Policy 3: Admins and coaches can update practices
CREATE POLICY "Admins and coaches can update practices"
  ON practices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- Policy 4: Only admins can delete practices
CREATE POLICY "Admins can delete practices"
  ON practices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- RSVPS TABLE RLS
-- ============================================

-- Enable RLS on rsvps table
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Users can create their own RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Users can update their own RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Users can delete their own RSVPs" ON rsvps;

-- Policy 1: Everyone can view all RSVPs
CREATE POLICY "Anyone can view RSVPs"
  ON rsvps
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Authenticated users can create their own RSVPs
CREATE POLICY "Users can create their own RSVPs"
  ON rsvps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own RSVPs
CREATE POLICY "Users can update their own RSVPs"
  ON rsvps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own RSVPs
CREATE POLICY "Users can delete their own RSVPs"
  ON rsvps
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify practices policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'practices'
ORDER BY policyname;

-- Verify rsvps policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'rsvps'
ORDER BY policyname;
