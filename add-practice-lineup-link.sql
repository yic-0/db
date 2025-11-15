-- Add practice_id to lineups table to link lineups to practices
-- This allows multiple boats per practice

-- Add practice_id column (optional - lineups can exist without a practice)
ALTER TABLE lineups
ADD COLUMN IF NOT EXISTS practice_id UUID REFERENCES practices(id) ON DELETE SET NULL;

-- Add boat identifier for multiple boats per practice
ALTER TABLE lineups
ADD COLUMN IF NOT EXISTS boat_name VARCHAR(100) DEFAULT 'Boat 1';

-- Create index for faster practice lineup queries
CREATE INDEX IF NOT EXISTS idx_lineups_practice_id ON lineups(practice_id);

-- Add helpful comment
COMMENT ON COLUMN lineups.practice_id IS 'Optional link to a practice. Allows multiple lineups (boats) per practice.';
COMMENT ON COLUMN lineups.boat_name IS 'Name or identifier for this boat (e.g., "Boat 1", "Dragon Spirit", "Competition Boat")';
