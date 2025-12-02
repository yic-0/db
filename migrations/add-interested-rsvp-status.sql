-- Add 'interested' as a valid RSVP status for events
-- This allows paddlers to express interest in an event without fully committing

-- Drop the existing check constraint
ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_status_check;

-- Add the new check constraint with 'interested' included
ALTER TABLE rsvps ADD CONSTRAINT rsvps_status_check
  CHECK (status IN ('yes', 'no', 'maybe', 'interested'));

-- Add comment for documentation
COMMENT ON COLUMN rsvps.status IS 'RSVP status: yes (confirmed going), no (not attending), maybe (uncertain), interested (interested but not committed)';
