-- FINAL FIX - Complete Solution
-- Run this ENTIRE script in Supabase SQL Editor

-- ==================================================
-- OPTION 1: Use Database Trigger (Recommended)
-- ==================================================

-- Step 1: Create function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_active, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    true,
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Step 4: Create minimal policies (trigger handles INSERT)
-- Allow users to view active profiles
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (is_active = true);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify setup
SELECT 'Trigger created successfully!' as status;
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'profiles';
