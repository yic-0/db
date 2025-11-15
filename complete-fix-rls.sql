-- COMPLETE FIX for Sign Up Issue
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- Step 1: Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Step 2: Recreate the profiles policies correctly
-- Policy 1: Allow authenticated users to insert their own profile
CREATE POLICY "Enable insert for authenticated users only"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 2: Allow users to view active profiles
CREATE POLICY "Enable read access for all users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 3: Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the policies were created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles';
