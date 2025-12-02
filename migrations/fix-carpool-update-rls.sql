-- Fix RLS policies for event_carpools table
-- Comprehensive fix for SELECT, INSERT, UPDATE, DELETE

-- First, check what policies exist (run this to see current state):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'event_carpools';

-- Enable RLS if not already enabled
ALTER TABLE event_carpools ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Admins and coaches can update carpools" ON event_carpools;
DROP POLICY IF EXISTS "Drivers can update their own carpools" ON event_carpools;
DROP POLICY IF EXISTS "event_carpools_update_policy" ON event_carpools;
DROP POLICY IF EXISTS "event_carpools_select_policy" ON event_carpools;
DROP POLICY IF EXISTS "event_carpools_insert_policy" ON event_carpools;
DROP POLICY IF EXISTS "event_carpools_delete_policy" ON event_carpools;
DROP POLICY IF EXISTS "Users can view carpools" ON event_carpools;
DROP POLICY IF EXISTS "Users can view event carpools" ON event_carpools;
DROP POLICY IF EXISTS "Authenticated users can view carpools" ON event_carpools;
DROP POLICY IF EXISTS "Anyone can view carpools" ON event_carpools;
DROP POLICY IF EXISTS "Admins can manage carpools" ON event_carpools;
DROP POLICY IF EXISTS "Drivers can manage own carpools" ON event_carpools;

-- SELECT: All authenticated users can view carpools
CREATE POLICY "event_carpools_select"
ON event_carpools
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Admins/coaches can create carpools, or users can create their own
CREATE POLICY "event_carpools_insert"
ON event_carpools
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'coach', 'manager')
  )
);

-- UPDATE: Admins/coaches can update any, drivers can update their own
CREATE POLICY "event_carpools_update"
ON event_carpools
FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'coach', 'manager')
  )
)
WITH CHECK (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'coach', 'manager')
  )
);

-- DELETE: Admins/coaches can delete any, drivers can delete their own
CREATE POLICY "event_carpools_delete"
ON event_carpools
FOR DELETE
TO authenticated
USING (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'coach', 'manager')
  )
);
