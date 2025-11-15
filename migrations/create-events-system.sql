-- Events System for Race Days, Competitions, and Team Activities
-- Supports races, hiking, social events with comprehensive planning features

-- Main events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'race', -- 'race', 'regatta', 'hiking', 'social', 'training_camp', 'other'
  description TEXT,
  location VARCHAR(500),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,

  -- Arrival and meeting info
  arrival_time TIME,
  captains_meeting_time TIME,
  captains_meeting_location VARCHAR(500),

  -- Registration and capacity
  max_participants INTEGER,
  registration_deadline TIMESTAMP,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'registration_open', 'confirmed', 'in_progress', 'completed', 'cancelled'

  -- Additional info
  notes TEXT,
  event_url VARCHAR(1000), -- Link to external event page/registration

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event RSVPs/Registration
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'interested', -- 'interested', 'registered', 'confirmed', 'declined', 'waitlist'

  -- Participation details
  role VARCHAR(100), -- 'paddler', 'steersperson', 'drummer', 'support', 'spectator'
  attending_races TEXT[], -- Array of race IDs they're participating in

  -- Response and notes
  response_notes TEXT,
  dietary_restrictions TEXT,

  -- Timestamps
  registered_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(event_id, user_id)
);

-- Carpool coordination
CREATE TABLE IF NOT EXISTS event_carpools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Vehicle info
  vehicle_description VARCHAR(255),
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,

  -- Logistics
  departure_location VARCHAR(500),
  departure_time TIME,
  return_time TIME,

  -- Costs
  estimated_cost_per_person DECIMAL(10, 2),
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Carpool passengers
CREATE TABLE IF NOT EXISTS event_carpool_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carpool_id UUID REFERENCES event_carpools(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  pickup_location VARCHAR(500),
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(carpool_id, passenger_id)
);

-- Financial tracking (entry fees, equipment rental, etc.)
CREATE TABLE IF NOT EXISTS event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Expense details
  expense_type VARCHAR(100) NOT NULL, -- 'registration_fee', 'equipment_rental', 'accommodation', 'meals', 'transportation', 'other'
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,

  -- Payment tracking
  due_date DATE,
  paid_by UUID REFERENCES profiles(id), -- Who paid initially
  is_shared BOOLEAN DEFAULT false, -- Split among participants

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual payment tracking
CREATE TABLE IF NOT EXISTS event_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES event_expenses(id) ON DELETE SET NULL,

  amount DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  payment_method VARCHAR(100),
  payment_date DATE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Waivers and documents
CREATE TABLE IF NOT EXISTS event_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  waiver_type VARCHAR(100) NOT NULL, -- 'liability', 'photo_release', 'covid', 'other'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,

  -- Document
  waiver_url VARCHAR(1000), -- Link to waiver document
  waiver_text TEXT, -- Or store text directly

  created_at TIMESTAMP DEFAULT NOW()
);

-- Waiver signatures
CREATE TABLE IF NOT EXISTS event_waiver_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_id UUID REFERENCES event_waivers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  signed_at TIMESTAMP DEFAULT NOW(),
  signature_type VARCHAR(50) DEFAULT 'digital', -- 'digital', 'physical'
  ip_address VARCHAR(100),

  UNIQUE(waiver_id, user_id)
);

-- Race schedule (for multi-race events)
CREATE TABLE IF NOT EXISTS event_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Race details
  race_name VARCHAR(255) NOT NULL,
  race_number INTEGER,
  distance VARCHAR(100), -- '200m', '500m', '2000m', etc.
  race_type VARCHAR(100), -- 'heat', 'semi-final', 'final', 'mixed', 'open', 'womens', etc.

  -- Timing
  scheduled_time TIME,
  actual_start_time TIME,

  -- Lineup
  lineup_id UUID REFERENCES lineups(id) ON DELETE SET NULL,

  -- Results
  finish_time TIME,
  finish_position INTEGER,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task/Checklist for event preparation
CREATE TABLE IF NOT EXISTS event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_category VARCHAR(100), -- 'logistics', 'equipment', 'registration', 'coordination', 'other'

  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,

  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX idx_event_carpools_event ON event_carpools(event_id);
CREATE INDEX idx_event_carpools_driver ON event_carpools(driver_id);
CREATE INDEX idx_event_expenses_event ON event_expenses(event_id);
CREATE INDEX idx_event_payments_user ON event_payments(user_id);
CREATE INDEX idx_event_races_event ON event_races(event_id);
CREATE INDEX idx_event_tasks_event ON event_tasks(event_id);

-- RLS Policies

-- Events: All members can view, only admins/coaches can create/edit
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
ON events FOR SELECT
USING (true);

CREATE POLICY "Admins and coaches can create events"
ON events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can update events"
ON events FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins can delete events"
ON events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Event RSVPs: Users can manage their own, coaches/admins can view all
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all RSVPs"
ON event_rsvps FOR SELECT
USING (true);

CREATE POLICY "Users can create their own RSVP"
ON event_rsvps FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVP, coaches/admins can update any"
ON event_rsvps FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Users can delete their own RSVP"
ON event_rsvps FOR DELETE
USING (auth.uid() = user_id);

-- Carpools: Creator and admins can manage
ALTER TABLE event_carpools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view carpools"
ON event_carpools FOR SELECT
USING (true);

CREATE POLICY "Users can create carpools"
ON event_carpools FOR INSERT
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Driver or admins can update carpool"
ON event_carpools FOR UPDATE
USING (
  auth.uid() = driver_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Driver or admins can delete carpool"
ON event_carpools FOR DELETE
USING (
  auth.uid() = driver_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Carpool passengers
ALTER TABLE event_carpool_passengers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view carpool passengers"
ON event_carpool_passengers FOR SELECT
USING (true);

CREATE POLICY "Users can join carpools"
ON event_carpool_passengers FOR INSERT
WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passenger or driver can update"
ON event_carpool_passengers FOR UPDATE
USING (
  auth.uid() = passenger_id
  OR
  EXISTS (
    SELECT 1 FROM event_carpools
    WHERE id = carpool_id AND driver_id = auth.uid()
  )
);

CREATE POLICY "Passenger can remove themselves"
ON event_carpool_passengers FOR DELETE
USING (auth.uid() = passenger_id);

-- Expenses: Admins/coaches only
ALTER TABLE event_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view expenses"
ON event_expenses FOR SELECT
USING (true);

CREATE POLICY "Admins and coaches can manage expenses"
ON event_expenses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Payments: Users can view their own, admins can view all
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments, admins can view all"
ON event_payments FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins and coaches can manage payments"
ON event_payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Waivers and signatures: Similar to expenses
ALTER TABLE event_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_waiver_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view waivers"
ON event_waivers FOR SELECT
USING (true);

CREATE POLICY "Admins and coaches can manage waivers"
ON event_waivers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Users can view all waiver signatures"
ON event_waiver_signatures FOR SELECT
USING (true);

CREATE POLICY "Users can sign waivers"
ON event_waiver_signatures FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Races: Coaches/admins manage
ALTER TABLE event_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view races"
ON event_races FOR SELECT
USING (true);

CREATE POLICY "Admins and coaches can manage races"
ON event_races FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Tasks: Assigned users and admins can manage
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks"
ON event_tasks FOR SELECT
USING (true);

CREATE POLICY "Admins and coaches can create tasks"
ON event_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Assigned user or admins can update tasks"
ON event_tasks FOR UPDATE
USING (
  auth.uid() = assigned_to
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Admins can delete tasks"
ON event_tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Comments
COMMENT ON TABLE events IS 'Main events table for races, regattas, hiking trips, and other team activities';
COMMENT ON TABLE event_rsvps IS 'Member registration and RSVP tracking for events';
COMMENT ON TABLE event_carpools IS 'Carpool coordination for event transportation';
COMMENT ON TABLE event_expenses IS 'Financial tracking for event-related costs';
COMMENT ON TABLE event_payments IS 'Individual payment tracking for participants';
COMMENT ON TABLE event_waivers IS 'Liability waivers and required documents';
COMMENT ON TABLE event_races IS 'Individual race schedule and results within an event';
COMMENT ON TABLE event_tasks IS 'Preparation checklist and task assignments';
