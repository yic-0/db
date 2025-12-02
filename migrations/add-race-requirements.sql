-- Add race/event requirements for eligibility validation
-- Allows admin to set gender ratios, age limits, and member type restrictions

-- Create race requirements table
-- Each event can have multiple requirement rules (e.g., mixed division rules, age categories)
CREATE TABLE IF NOT EXISTS event_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Team size
  min_paddlers INTEGER,          -- Minimum paddlers (excluding drummer/steerer)
  max_paddlers INTEGER,          -- Maximum paddlers (excluding drummer/steerer)

  -- Gender requirements
  min_female INTEGER,            -- Minimum female paddlers
  max_female INTEGER,            -- Maximum female paddlers
  min_male INTEGER,              -- Minimum male paddlers
  max_male INTEGER,              -- Maximum male paddlers
  gender_ratio TEXT,             -- e.g., '50:50', 'open', 'women-only', 'men-only'

  -- Age requirements
  min_age INTEGER,               -- Minimum age at time of event
  max_age INTEGER,               -- Maximum age at time of event
  age_reference_date DATE,       -- Date for age calculation (usually event date)

  -- Member type requirements
  allowed_member_types TEXT[],   -- Array of allowed types: ['corporate', 'friends-family', 'ex-corporate', 'community']
  corporate_only BOOLEAN DEFAULT false,  -- Shortcut for corporate-only races

  -- Labels and notes
  requirement_name TEXT,         -- e.g., 'Mixed Division Rules', 'Senior Category'
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_requirements_event ON event_requirements(event_id);

-- Add column to events for quick reference
ALTER TABLE events ADD COLUMN IF NOT EXISTS has_requirements BOOLEAN DEFAULT false;

-- RLS policies
ALTER TABLE event_requirements ENABLE ROW LEVEL SECURITY;

-- Everyone can view requirements
CREATE POLICY "Users can view event requirements" ON event_requirements
  FOR SELECT USING (true);

-- Only admin/coach can manage requirements
CREATE POLICY "Admin can manage event requirements" ON event_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Comments
COMMENT ON TABLE event_requirements IS 'Race/event eligibility requirements for team composition validation';
COMMENT ON COLUMN event_requirements.gender_ratio IS 'Gender requirement type: 50:50, open, women-only, men-only';
COMMENT ON COLUMN event_requirements.allowed_member_types IS 'Array of allowed membership types for this event';
COMMENT ON COLUMN event_requirements.age_reference_date IS 'Date used for age calculation, typically event start date';
