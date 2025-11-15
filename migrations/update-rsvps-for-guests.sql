-- Update RSVPs table to support guest paddlers
-- This allows guests (who don't have auth accounts) to have attendance records

-- First, check if there's a foreign key constraint from rsvps.user_id to auth.users
-- Drop it if it exists to allow guest profile IDs that don't correspond to auth users
ALTER TABLE rsvps
DROP CONSTRAINT IF EXISTS rsvps_user_id_fkey;

-- The user_id should reference profiles.id instead (which includes both auth users and guests)
-- Add a new foreign key constraint to profiles table
ALTER TABLE rsvps
ADD CONSTRAINT rsvps_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Allow NULL status for walk-ins (guests who show up without RSVP)
-- This lets us distinguish between "RSVP'd no" and "didn't RSVP but showed up"
ALTER TABLE rsvps
ALTER COLUMN status DROP NOT NULL;

-- Update RLS policies for rsvps table to allow coaches/admins to manage attendance for guests
-- Drop existing policies (all possible variations)
DROP POLICY IF EXISTS "Users can view their own RSVP" ON rsvps;
DROP POLICY IF EXISTS "Users can manage their own RSVP" ON rsvps;
DROP POLICY IF EXISTS "Coaches can view all RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Coaches can manage RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Allow users to view RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Allow users to manage RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Allow RSVP viewing" ON rsvps;
DROP POLICY IF EXISTS "Allow RSVP management" ON rsvps;
DROP POLICY IF EXISTS "Allow RSVP creation" ON rsvps;
DROP POLICY IF EXISTS "Allow RSVP updates" ON rsvps;
DROP POLICY IF EXISTS "Allow RSVP deletion" ON rsvps;

-- Create SELECT policy - users can view their own RSVPs, coaches/admins can view all
CREATE POLICY "Allow RSVP viewing"
ON rsvps FOR SELECT
USING (
  -- User viewing their own RSVP
  auth.uid() = user_id
  OR
  -- Coach/admin viewing any RSVP
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Create INSERT policy - users can create their own RSVPs, coaches/admins can create for anyone
CREATE POLICY "Allow RSVP creation"
ON rsvps FOR INSERT
WITH CHECK (
  -- User creating their own RSVP
  auth.uid() = user_id
  OR
  -- Coach/admin creating RSVP for anyone (including guests)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Create UPDATE policy - users can update their own RSVPs, coaches/admins can update any
CREATE POLICY "Allow RSVP updates"
ON rsvps FOR UPDATE
USING (
  -- User updating their own RSVP
  auth.uid() = user_id
  OR
  -- Coach/admin updating any RSVP
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
)
WITH CHECK (
  -- User updating their own RSVP
  auth.uid() = user_id
  OR
  -- Coach/admin updating any RSVP
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Create DELETE policy - users can delete their own RSVPs, admins can delete any
CREATE POLICY "Allow RSVP deletion"
ON rsvps FOR DELETE
USING (
  -- User deleting their own RSVP
  auth.uid() = user_id
  OR
  -- Admin deleting any RSVP
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
