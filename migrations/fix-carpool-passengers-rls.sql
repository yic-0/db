-- Fix RLS policy for event_carpool_passengers to allow admin/coach assignment

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can join carpools" ON event_carpool_passengers;

-- Create new policy that allows:
-- 1. Users to add themselves to carpools
-- 2. Admins and coaches to add anyone to carpools
CREATE POLICY "Users can join carpools or admins can assign"
ON event_carpool_passengers
FOR INSERT
WITH CHECK (
  -- User is adding themselves
  auth.uid() = passenger_id
  OR
  -- User is admin or coach
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Also update the delete policy to allow admins/coaches to remove passengers
DROP POLICY IF EXISTS "Users can leave carpools" ON event_carpool_passengers;

CREATE POLICY "Users can leave carpools or admins can remove"
ON event_carpool_passengers
FOR DELETE
USING (
  -- User is removing themselves
  auth.uid() = passenger_id
  OR
  -- User is the driver (can remove passengers from their car)
  EXISTS (
    SELECT 1 FROM event_carpools
    WHERE id = carpool_id
    AND driver_id = auth.uid()
  )
  OR
  -- User is admin or coach
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);
