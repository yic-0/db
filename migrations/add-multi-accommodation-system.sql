-- Multi-accommodation system for events
-- Allows multiple hotels/lodging options per event with member assignments

-- Table for accommodation options (hotels, airbnbs, etc.)
CREATE TABLE IF NOT EXISTS event_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Holiday Inn Downtown", "Team House A"
  address TEXT,                          -- Full address
  booking_link TEXT,                     -- URL to booking site
  check_in TEXT,                         -- "Fri 3:00 PM" or "2024-03-15 15:00"
  check_out TEXT,                        -- "Sun 11:00 AM" or "2024-03-17 11:00"
  price_info TEXT,                       -- "$120/night", "Group rate: $99/night"
  total_capacity INTEGER,                -- Total people it can hold
  total_rooms INTEGER,                   -- Number of rooms available
  notes TEXT,                            -- Additional info, amenities, etc.
  contact_info TEXT,                     -- Phone/email for reservations
  is_primary BOOLEAN DEFAULT false,      -- Mark as primary/recommended option
  sort_order INTEGER DEFAULT 0,          -- Display order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for room assignments within accommodations
CREATE TABLE IF NOT EXISTS event_accommodation_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id UUID NOT NULL REFERENCES event_accommodations(id) ON DELETE CASCADE,
  room_label TEXT NOT NULL,              -- "Room 301", "Bedroom A", "Queen Room 1"
  capacity INTEGER DEFAULT 2,            -- How many people fit
  notes TEXT,                            -- "Has wheelchair access", "Ground floor"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for assigning members to rooms
CREATE TABLE IF NOT EXISTS event_accommodation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES event_accommodation_rooms(id) ON DELETE CASCADE,
  accommodation_id UUID NOT NULL REFERENCES event_accommodations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  assignment_status TEXT DEFAULT 'assigned',  -- 'assigned', 'confirmed', 'declined'
  notes TEXT,                            -- Special requests, preferences
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)              -- One assignment per person per event
);

-- Add accommodation preference to event registrations
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS preferred_accommodation_id UUID REFERENCES event_accommodations(id) ON DELETE SET NULL;

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS roommate_preferences TEXT;  -- Free text for roommate requests

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_accommodations_event_id ON event_accommodations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_accommodation_rooms_accommodation_id ON event_accommodation_rooms(accommodation_id);
CREATE INDEX IF NOT EXISTS idx_event_accommodation_assignments_event_id ON event_accommodation_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_accommodation_assignments_user_id ON event_accommodation_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_accommodation_assignments_accommodation_id ON event_accommodation_assignments(accommodation_id);

-- RLS Policies
ALTER TABLE event_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_accommodation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_accommodation_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view event accommodations" ON event_accommodations;
DROP POLICY IF EXISTS "Admins can manage event accommodations" ON event_accommodations;
DROP POLICY IF EXISTS "Users can view accommodation rooms" ON event_accommodation_rooms;
DROP POLICY IF EXISTS "Admins can manage accommodation rooms" ON event_accommodation_rooms;
DROP POLICY IF EXISTS "Users can view own accommodation assignments" ON event_accommodation_assignments;
DROP POLICY IF EXISTS "Admins can manage accommodation assignments" ON event_accommodation_assignments;

-- Everyone can view accommodations for events they can see
CREATE POLICY "Users can view event accommodations"
  ON event_accommodations FOR SELECT
  USING (true);

-- Only admins/coaches can manage accommodations
CREATE POLICY "Admins can manage event accommodations"
  ON event_accommodations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Everyone can view rooms
CREATE POLICY "Users can view accommodation rooms"
  ON event_accommodation_rooms FOR SELECT
  USING (true);

-- Only admins/coaches can manage rooms
CREATE POLICY "Admins can manage accommodation rooms"
  ON event_accommodation_rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Users can view their own assignments, admins can view all
CREATE POLICY "Users can view own accommodation assignments"
  ON event_accommodation_assignments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Only admins/coaches can manage assignments
CREATE POLICY "Admins can manage accommodation assignments"
  ON event_accommodation_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Comments
COMMENT ON TABLE event_accommodations IS 'Accommodation options (hotels, houses) for events';
COMMENT ON TABLE event_accommodation_rooms IS 'Individual rooms within accommodations';
COMMENT ON TABLE event_accommodation_assignments IS 'Member assignments to specific accommodations/rooms';
COMMENT ON COLUMN event_accommodations.is_primary IS 'Mark as the main/recommended accommodation';
COMMENT ON COLUMN event_accommodation_assignments.assignment_status IS 'Status: assigned, confirmed, declined';
