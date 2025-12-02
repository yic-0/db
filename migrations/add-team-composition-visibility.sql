-- Add visibility control for team composition on Race Day tab
-- Allows admin/coach to control when paddlers can see who is on each team

-- Add visibility field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_team_composition BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN events.show_team_composition IS 'Controls whether regular members can see team member assignments on Race Day. Default false - hidden until coach publishes.';
