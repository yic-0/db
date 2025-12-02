-- Add role indicators and exclude_from_count to team members
-- Allows marking members as drummer, steerer, or alternate with option to exclude from paddler count

-- Add position_role field (drummer, steerer, alternate, paddler)
ALTER TABLE event_team_members ADD COLUMN IF NOT EXISTS position_role TEXT DEFAULT 'paddler';

-- Add exclude_from_count field (for drummers/steerers who shouldn't count toward paddler requirements)
ALTER TABLE event_team_members ADD COLUMN IF NOT EXISTS exclude_from_count BOOLEAN DEFAULT false;

-- Add constraint for valid position roles
ALTER TABLE event_team_members ADD CONSTRAINT valid_position_role
  CHECK (position_role IN ('paddler', 'drummer', 'steerer', 'alternate'));

-- Comments
COMMENT ON COLUMN event_team_members.position_role IS 'Role in the boat: paddler, drummer, steerer, or alternate';
COMMENT ON COLUMN event_team_members.exclude_from_count IS 'If true, member is not counted toward paddler requirements (e.g., drummer/steerer)';
