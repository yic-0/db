-- Complete RLS Setup for Profiles Table
-- This includes policies for roster management
-- Run this in Supabase SQL Editor

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- ============================================
-- SELECT POLICIES
-- ============================================

-- Policy 1: Allow authenticated users to view active profiles
CREATE POLICY "Enable read access for all users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================
-- INSERT POLICIES
-- ============================================

-- Policy 2: Allow authenticated users to insert their own profile during signup
CREATE POLICY "Enable insert for authenticated users only"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- UPDATE POLICIES
-- ============================================

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Allow admins and coaches to update any profile
-- This is for roster management
CREATE POLICY "Admins can update any profile"
  ON profiles
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

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the policies were created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
