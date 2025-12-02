-- Add visibility control for lineups
-- Allows admin/coach to control when paddlers can see lineups linked to events

-- Add visibility field to lineups table
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS is_visible_to_members BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN lineups.is_visible_to_members IS 'Controls whether regular members can see this lineup. Default false - admin must explicitly publish the lineup.';

-- Index for filtering visible lineups
CREATE INDEX IF NOT EXISTS idx_lineups_visible ON lineups(is_visible_to_members) WHERE is_visible_to_members = true;
