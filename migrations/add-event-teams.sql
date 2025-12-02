-- Add multi-team support for events
-- Allows splitting participants into multiple teams/boats with separate race schedules

-- Create event_teams table
CREATE TABLE IF NOT EXISTS event_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  team_color VARCHAR(50),           -- CSS color for UI differentiation (e.g., 'blue', '#3B82F6')
  sort_order INTEGER DEFAULT 0,      -- Display ordering
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_teams_event_id ON event_teams(event_id);

-- Create event_team_members table (assigns registered participants to teams)
CREATE TABLE IF NOT EXISTS event_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(100),  -- 'paddler', 'steersperson', 'drummer', 'alternate'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_team_members_team_id ON event_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_event_team_members_user_id ON event_team_members(user_id);

-- Add team_id to event_races table
ALTER TABLE event_races ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES event_teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_event_races_team_id ON event_races(team_id);

-- RLS Policies for event_teams
ALTER TABLE event_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event teams"
  ON event_teams
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and coaches can create event teams"
  ON event_teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  );

CREATE POLICY "Admins and coaches can update event teams"
  ON event_teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  );

CREATE POLICY "Admins and coaches can delete event teams"
  ON event_teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  );

-- RLS Policies for event_team_members
ALTER TABLE event_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team members"
  ON event_team_members
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and coaches can add team members"
  ON event_team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  );

CREATE POLICY "Admins and coaches can update team members"
  ON event_team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  );

CREATE POLICY "Admins and coaches can remove team members"
  ON event_team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  );

-- Comments for documentation
COMMENT ON TABLE event_teams IS 'Teams/boats within an event for splitting participants';
COMMENT ON TABLE event_team_members IS 'Assigns registered participants to specific event teams';
COMMENT ON COLUMN event_teams.team_color IS 'CSS color value for UI differentiation';
COMMENT ON COLUMN event_teams.sort_order IS 'Order in which teams are displayed';
COMMENT ON COLUMN event_team_members.role IS 'Role within the team: paddler, steersperson, drummer, alternate';
COMMENT ON COLUMN event_races.team_id IS 'Links race to a specific team within the event';
