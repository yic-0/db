-- Fix RLS policies for RSVPs table to allow coaches/admins to manage attendance
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies on rsvps table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'rsvps')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON rsvps';
    END LOOP;
END $$;

-- View policy: Everyone can view all RSVPs
CREATE POLICY "Anyone can view RSVPs"
ON rsvps FOR SELECT
TO authenticated
USING (true);

-- Insert policy: Users can insert their own RSVPs OR admins/coaches can insert for anyone
CREATE POLICY "Users can insert RSVPs or admins/coaches can insert for anyone"
ON rsvps FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'coach')
  )
);

-- Update policy: Users can update their own RSVPs OR admins/coaches can update anyone's RSVPs
CREATE POLICY "Users can update RSVPs or admins/coaches can update any RSVP"
ON rsvps FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'coach')
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'coach')
  )
);

-- Delete policy: Only admins can delete RSVPs
CREATE POLICY "Admins can delete RSVPs"
ON rsvps FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verify the policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rsvps';
