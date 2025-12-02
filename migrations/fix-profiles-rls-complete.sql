-- Comprehensive RLS fix for profiles table
-- This ensures all policies work together correctly

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile viewing" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches and admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation for users and guests" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches and admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Allow guest deletion" ON profiles;
DROP POLICY IF EXISTS "Allow guest profile deletion" ON profiles;

-- 1. SELECT Policy - Must exist for EXISTS queries to work in other policies
CREATE POLICY "Allow profile viewing"
ON profiles FOR SELECT
USING (true); -- Everyone can view all profiles

-- 2. INSERT Policy
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

-- 3. UPDATE Policy
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

-- 4. DELETE Policy
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

-- Comments
COMMENT ON POLICY "Allow profile viewing" ON profiles IS 'Everyone can view all profiles';
COMMENT ON POLICY "Allow profile creation for users and guests" ON profiles IS 'Users can create their own profile, coaches/admins can create guest profiles';
COMMENT ON POLICY "Allow profile updates" ON profiles IS 'Users can update their own profile, admins/coaches can update any profile including is_active';
COMMENT ON POLICY "Allow guest profile deletion" ON profiles IS 'Admins/coaches can delete guest profiles, admins can delete any profile';
