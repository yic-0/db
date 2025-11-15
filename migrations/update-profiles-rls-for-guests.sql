-- Update RLS policies to allow coaches/admins to create guest profiles
-- This allows adding guest paddlers without requiring them to have auth accounts

-- First, drop the foreign key constraint that requires profiles.id to match auth.users.id
-- This allows guest profiles to have IDs that don't correspond to auth users
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop all existing policies to recreate them
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches and admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation for users and guests" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches and admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Allow guest deletion" ON profiles;
DROP POLICY IF EXISTS "Allow guest profile deletion" ON profiles;

-- Create new INSERT policy that allows:
-- 1. Users to insert their own profile (user_id matches auth.uid())
-- 2. Coaches and admins to insert guest profiles (is_guest = true)
CREATE POLICY "Allow profile creation for users and guests"
ON profiles FOR INSERT
WITH CHECK (
  -- User creating their own profile
  auth.uid() = id
  OR
  -- Coach/admin creating a guest profile
  (
    is_guest = true
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  )
);

-- Also update the UPDATE policy to allow coaches/admins to update guest profiles
CREATE POLICY "Allow profile updates"
ON profiles FOR UPDATE
USING (
  -- User updating their own profile
  auth.uid() = id
  OR
  -- Admin/coach updating any profile
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
)
WITH CHECK (
  -- User updating their own profile
  auth.uid() = id
  OR
  -- Admin/coach updating any profile
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Allow coaches/admins to delete guest profiles
CREATE POLICY "Allow guest profile deletion"
ON profiles FOR DELETE
USING (
  -- Admin/coach deleting guest profiles
  (
    is_guest = true
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  )
  OR
  -- Admin can delete any profile
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
