-- Add requirements directly to event_teams table
-- Each team can have its own division/eligibility requirements

-- Team size requirements
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS min_paddlers INTEGER;
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS max_paddlers INTEGER;

-- Gender requirements
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS min_female INTEGER;
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS max_female INTEGER;
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS min_male INTEGER;
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS max_male INTEGER;
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS gender_ratio TEXT; -- '50:50', 'open', 'women-only', 'men-only'

-- Age requirements
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS min_age INTEGER;
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS max_age INTEGER;

-- Member type requirements
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS corporate_only BOOLEAN DEFAULT false;

-- Division name (e.g., "Mixed", "Open", "Senior 40+")
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS division_name TEXT;

-- Comments
COMMENT ON COLUMN event_teams.division_name IS 'Division category: Mixed, Open, Women, Senior, etc.';
COMMENT ON COLUMN event_teams.gender_ratio IS 'Gender requirement: 50:50, open, women-only, men-only';
COMMENT ON COLUMN event_teams.min_paddlers IS 'Minimum paddlers (excluding drummer/steerer)';
COMMENT ON COLUMN event_teams.max_paddlers IS 'Maximum paddlers (excluding drummer/steerer)';
