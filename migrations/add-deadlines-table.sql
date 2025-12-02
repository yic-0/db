-- Create modular deadlines table
-- Deadlines can be associated with an event (race) or standalone

CREATE TABLE IF NOT EXISTS deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  deadline_date DATE NOT NULL,
  deadline_time TIME,
  description TEXT,
  deadline_type TEXT DEFAULT 'custom', -- 'registration', 'early_bird', 'payment', 'custom', etc.

  -- Optional association with an event (race)
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Visibility control (default hidden from members)
  is_visible_to_members BOOLEAN DEFAULT false,

  -- Audit fields
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_deadlines_event_id ON deadlines(event_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_deadline_date ON deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_visible ON deadlines(is_visible_to_members);

-- Enable RLS
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view visible deadlines or all if admin/coach
CREATE POLICY "Users can view visible deadlines" ON deadlines
  FOR SELECT USING (
    is_visible_to_members = true
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'coordinator')
    )
  );

-- Only admin/coach can insert
CREATE POLICY "Admins can insert deadlines" ON deadlines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'coordinator')
    )
  );

-- Only admin/coach can update
CREATE POLICY "Admins can update deadlines" ON deadlines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'coordinator')
    )
  );

-- Only admin/coach can delete
CREATE POLICY "Admins can delete deadlines" ON deadlines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'coordinator')
    )
  );

-- Comments
COMMENT ON TABLE deadlines IS 'Modular deadlines that can be standalone or associated with events';
COMMENT ON COLUMN deadlines.event_id IS 'Optional - link to an event/race. NULL for standalone deadlines';
COMMENT ON COLUMN deadlines.deadline_type IS 'Type: registration, early_bird, payment, custom, etc.';
COMMENT ON COLUMN deadlines.is_visible_to_members IS 'If false, only admins/coaches can see this deadline';
