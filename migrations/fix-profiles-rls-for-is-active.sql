-- Fix RLS policies to allow updating is_active field
-- Ensures admins/coaches can update any profile, including is_active status

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;

-- Recreate UPDATE policy with explicit permissions
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

-- Add comment
COMMENT ON POLICY "Allow profile updates" ON profiles IS 'Allows users to update their own profile and admins/coaches to update any profile, including is_active status';
