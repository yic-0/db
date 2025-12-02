-- Add event_id to lineups table
-- Allows lineups to be linked to events (races, regattas, etc.) in addition to practices

-- Add event_id field to lineups table
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_lineups_event_id ON lineups(event_id);

-- Add comment for documentation
COMMENT ON COLUMN lineups.event_id IS 'Links lineup to a specific event (race/regatta). Nullable - lineup can be linked to either practice_id OR event_id or neither.';

-- Note: A lineup can be linked to either a practice OR an event OR neither, but not both
-- This is enforced at the application layer
