-- Unified Calendar & Races System
-- Supports prospective races with deadlines and confirmed races with additional dates

-- Prospective Races (tentative/planning stage)
CREATE TABLE IF NOT EXISTS prospective_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  description TEXT,

  -- Race Date (tentative)
  race_date DATE NOT NULL,

  -- Deadlines
  early_bird_deadline DATE,
  registration_deadline DATE,
  payment_deadline DATE,

  -- Financials
  estimated_cost DECIMAL(10, 2),
  early_bird_cost DECIMAL(10, 2),

  -- Status
  status VARCHAR(50) DEFAULT 'prospective', -- prospective, confirmed, cancelled
  is_visible_to_members BOOLEAN DEFAULT false, -- Admin can toggle visibility

  -- Notes
  notes TEXT,
  external_link VARCHAR(500), -- Link to race website

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Confirmed Races (converted from prospective or created directly)
CREATE TABLE IF NOT EXISTS confirmed_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospective_race_id UUID REFERENCES prospective_races(id) ON DELETE SET NULL, -- If converted
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  venue_address TEXT,
  description TEXT,

  -- Key Dates
  race_date DATE NOT NULL,
  race_start_time TIME,
  race_end_time TIME,

  -- Additional Important Dates
  captains_meeting_date TIMESTAMP,
  team_briefing_date TIMESTAMP,
  lineup_submission_deadline TIMESTAMP,
  payment_due_date DATE,

  -- Registration
  registration_confirmed BOOLEAN DEFAULT false,
  registration_notes TEXT,

  -- Financials
  total_cost DECIMAL(10, 2),
  per_person_cost DECIMAL(10, 2),
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, partial, paid

  -- Visibility
  is_visible_to_members BOOLEAN DEFAULT true,

  -- Notes
  notes TEXT,
  external_link VARCHAR(500),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Race Reminders (for deadlines)
CREATE TABLE IF NOT EXISTS race_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to race
  prospective_race_id UUID REFERENCES prospective_races(id) ON DELETE CASCADE,
  confirmed_race_id UUID REFERENCES confirmed_races(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_type VARCHAR(100) NOT NULL, -- early_bird, registration, payment, captains_meeting, etc.
  reminder_date TIMESTAMP NOT NULL,
  message TEXT,

  -- Status
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT at_least_one_race CHECK (
    prospective_race_id IS NOT NULL OR confirmed_race_id IS NOT NULL
  )
);

-- Race Participants (who's going to the race)
CREATE TABLE IF NOT EXISTS race_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  confirmed_race_id UUID REFERENCES confirmed_races(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) DEFAULT 'interested', -- interested, confirmed, paid, withdrawn
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid
  amount_paid DECIMAL(10, 2) DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(confirmed_race_id, user_id)
);

-- Calendar Visibility Settings (per user/coach preferences)
CREATE TABLE IF NOT EXISTS calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Toggle visibility for each category
  show_practices BOOLEAN DEFAULT true,
  show_confirmed_races BOOLEAN DEFAULT true,
  show_prospective_races BOOLEAN DEFAULT true,
  show_team_events BOOLEAN DEFAULT true,
  show_deadlines BOOLEAN DEFAULT true,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prospective_races_date ON prospective_races(race_date);
CREATE INDEX idx_prospective_races_status ON prospective_races(status);
CREATE INDEX idx_confirmed_races_date ON confirmed_races(race_date);
CREATE INDEX idx_race_reminders_date ON race_reminders(reminder_date);
CREATE INDEX idx_race_participants_race ON race_participants(confirmed_race_id);
CREATE INDEX idx_race_participants_user ON race_participants(user_id);

-- RLS Policies

-- Prospective Races
ALTER TABLE prospective_races ENABLE ROW LEVEL SECURITY;

-- Only admins/coaches can see all prospective races
-- Members can only see if is_visible_to_members is true
CREATE POLICY "View prospective races based on visibility"
ON prospective_races FOR SELECT
USING (
  is_visible_to_members = true
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can create prospective races"
ON prospective_races FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can update prospective races"
ON prospective_races FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can delete prospective races"
ON prospective_races FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Confirmed Races
ALTER TABLE confirmed_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View confirmed races based on visibility"
ON confirmed_races FOR SELECT
USING (
  is_visible_to_members = true
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can create confirmed races"
ON confirmed_races FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can update confirmed races"
ON confirmed_races FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can delete confirmed races"
ON confirmed_races FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Race Reminders
ALTER TABLE race_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and coaches can manage reminders"
ON race_reminders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Race Participants
ALTER TABLE race_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view race participants"
ON race_participants FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Users can manage their own participation"
ON race_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and coaches can update participation"
ON race_participants FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Users and coaches can delete participation"
ON race_participants FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Calendar Settings
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendar settings"
ON calendar_settings FOR ALL
USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE prospective_races IS 'Tentative race listings that may be converted to confirmed races';
COMMENT ON TABLE confirmed_races IS 'Confirmed races with full details and registration';
COMMENT ON TABLE race_reminders IS 'Automated reminders for race deadlines';
COMMENT ON TABLE race_participants IS 'Track who is participating in confirmed races';
COMMENT ON TABLE calendar_settings IS 'User preferences for calendar visibility toggles';
