-- Unify RSVP Systems
-- Merge event_rsvps into rsvps table to have ONE unified RSVP system for ALL team activities:
-- - Practices
-- - Events (races, regattas, social events, hiking trips, training camps, etc.)

-- Step 1: Add event_id column to rsvps table
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Step 2: Make practice_id nullable (since RSVPs can be for either practices or events)
ALTER TABLE rsvps ALTER COLUMN practice_id DROP NOT NULL;

-- Step 3: Add columns from event_rsvps to rsvps
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS role VARCHAR(100); -- 'paddler', 'steersperson', 'drummer', 'support', 'spectator'
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS response_notes TEXT;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS attending_races TEXT[]; -- Array of race IDs they're participating in
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();

-- Step 4: Add constraint to ensure either practice_id or event_id is set (but not both or neither)
ALTER TABLE rsvps ADD CONSTRAINT rsvps_practice_or_event_check
  CHECK (
    (practice_id IS NOT NULL AND event_id IS NULL) OR
    (practice_id IS NULL AND event_id IS NOT NULL)
  );

-- Step 5: Migrate data from event_rsvps to rsvps
INSERT INTO rsvps (
  event_id,
  user_id,
  status,
  role,
  response_notes,
  dietary_restrictions,
  attending_races,
  registered_at,
  notes,
  attended,
  member_notes,
  checked_in_at,
  checked_in_by
)
SELECT
  event_id,
  user_id,
  CASE
    WHEN status IN ('interested', 'registered', 'confirmed') THEN 'yes'
    WHEN status = 'declined' THEN 'no'
    WHEN status = 'waitlist' THEN 'maybe'
    ELSE 'yes'
  END as status,  -- Convert event statuses to practice-style yes/no/maybe
  role,
  response_notes,
  dietary_restrictions,
  attending_races,
  registered_at,
  NULL as notes,  -- Event RSVPs don't have separate 'notes' field
  false as attended,  -- Default to not attended
  NULL as member_notes,
  NULL as checked_in_at,
  NULL as checked_in_by
FROM event_rsvps
ON CONFLICT DO NOTHING;  -- In case there are duplicates

-- Step 6: Update unique constraint to handle both practices and events
-- Drop old constraint
ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_practice_id_user_id_key;

-- Use partial unique indexes instead of constraints to avoid NULL issues
CREATE UNIQUE INDEX IF NOT EXISTS rsvps_unique_practice_user
  ON rsvps(practice_id, user_id)
  WHERE practice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rsvps_unique_event_user
  ON rsvps(event_id, user_id)
  WHERE event_id IS NOT NULL;

-- Step 7: Create indexes for event_id
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_event_user ON rsvps(event_id, user_id);

-- Step 8: Update RLS policies for the unified rsvps table
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view all RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Users can create their own RSVP" ON rsvps;
DROP POLICY IF EXISTS "Users can update their own RSVP" ON rsvps;
DROP POLICY IF EXISTS "Users can delete their own RSVP" ON rsvps;
DROP POLICY IF EXISTS "Coaches and admins can update any RSVP" ON rsvps;

-- Recreate policies to handle both practices and events
CREATE POLICY "Users can view all RSVPs"
ON rsvps FOR SELECT
USING (true);

CREATE POLICY "Users can create their own RSVP"
ON rsvps FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVP, coaches/admins can update any"
ON rsvps FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Users can delete their own RSVP"
ON rsvps FOR DELETE
USING (auth.uid() = user_id);

-- Step 9: Drop the old event_rsvps table (after confirming migration is successful)
-- IMPORTANT: Uncomment this line after verifying the migration worked correctly
-- DROP TABLE IF EXISTS event_rsvps CASCADE;

-- Comments
COMMENT ON COLUMN rsvps.event_id IS 'References events table for event RSVPs (mutually exclusive with practice_id)';
COMMENT ON COLUMN rsvps.role IS 'Role for event participation: paddler, steersperson, drummer, support, spectator';
COMMENT ON COLUMN rsvps.response_notes IS 'Member response notes for event RSVP';
COMMENT ON COLUMN rsvps.dietary_restrictions IS 'Dietary restrictions for event planning';
COMMENT ON COLUMN rsvps.attending_races IS 'Array of specific race IDs within an event that the member is participating in';
COMMENT ON COLUMN rsvps.registered_at IS 'Timestamp when the RSVP was first created';

COMMENT ON TABLE rsvps IS 'Unified RSVP system for both practices and events';
