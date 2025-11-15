-- Fix RLS Policies for Sign Up
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;

-- PROFILES POLICIES (Fixed)
-- Allow everyone to view active profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (is_active = true);

-- Allow users to INSERT their own profile during signup
CREATE POLICY "Users can insert own profile on signup"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Verify policies are enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
