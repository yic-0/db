-- Migration: Add onboarding and event registration system
-- Part 1: Add new profile fields for onboarding

-- Onboarding status to track member progression
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'none'
  CHECK (onboarding_status IN ('none', 'bare_bone', 'full'));

-- Safety-critical fields (bare-bone onboarding)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS swimming_ability TEXT DEFAULT NULL
  CHECK (swimming_ability IN ('none', 'basic', 'competent', 'strong'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS physical_limitations TEXT DEFAULT NULL;

-- Full onboarding fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS previous_sports_experience TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_conditions TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS competitive_level TEXT DEFAULT NULL
  CHECK (competitive_level IN ('recreational', 'competitive', 'elite'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_emergency_name TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_emergency_phone TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_emergency_relationship TEXT DEFAULT NULL;

-- Track when onboarding was completed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Comments for documentation
COMMENT ON COLUMN profiles.onboarding_status IS 'Tracks member onboarding progress: none (new), bare_bone (trial), full (committed)';
COMMENT ON COLUMN profiles.swimming_ability IS 'Safety critical - required for bare-bone onboarding';
COMMENT ON COLUMN profiles.physical_limitations IS 'Basic safety info for bare-bone, detailed for full onboarding';
COMMENT ON COLUMN profiles.competitive_level IS 'Member expectations: recreational, competitive, or elite';

-- Part 2: Event Registration Configuration (admin-defined per event)
CREATE TABLE IF NOT EXISTS event_registration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Which fields to show
  show_availability BOOLEAN DEFAULT true,
  show_carpool_needs BOOLEAN DEFAULT true,
  show_accommodation_needs BOOLEAN DEFAULT false,
  show_dietary_restrictions BOOLEAN DEFAULT false,
  show_waiver_acknowledgment BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  show_notes BOOLEAN DEFAULT true,

  -- Which fields are required
  require_availability BOOLEAN DEFAULT false,
  require_carpool_needs BOOLEAN DEFAULT false,
  require_accommodation_needs BOOLEAN DEFAULT false,
  require_waiver_acknowledgment BOOLEAN DEFAULT true,
  require_signature BOOLEAN DEFAULT false,

  -- Waiver configuration
  waiver_text TEXT DEFAULT NULL,
  waiver_url TEXT DEFAULT NULL,

  -- Data retention
  delete_sensitive_after_event BOOLEAN DEFAULT false,
  days_to_retain_after_event INTEGER DEFAULT 30,

  -- Visibility
  is_registration_open BOOLEAN DEFAULT true,
  registration_deadline TIMESTAMPTZ DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id)
);

-- Part 3: Event Registrations (member responses per event)
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Responses
  availability_dates JSONB DEFAULT NULL, -- Array of available dates
  availability_notes TEXT DEFAULT NULL,
  carpool_needs TEXT DEFAULT NULL CHECK (carpool_needs IN ('need_ride', 'can_drive', 'not_needed', 'undecided')),
  carpool_seats_available INTEGER DEFAULT NULL,
  carpool_departure_location TEXT DEFAULT NULL, -- Pickup/departure location
  carpool_return_location TEXT DEFAULT NULL, -- Dropoff/return location
  accommodation_needs TEXT DEFAULT NULL CHECK (accommodation_needs IN ('need_accommodation', 'have_accommodation', 'not_needed', 'undecided')),
  accommodation_notes TEXT DEFAULT NULL,
  dietary_restrictions TEXT DEFAULT NULL, -- Can override profile if different for this event
  notes TEXT DEFAULT NULL,

  -- Waiver
  waiver_acknowledged BOOLEAN DEFAULT false,
  waiver_acknowledged_at TIMESTAMPTZ DEFAULT NULL,
  signature_data TEXT DEFAULT NULL, -- Base64 signature image
  signed_at TIMESTAMPTZ DEFAULT NULL,

  -- Status tracking
  status TEXT DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'submitted', 'confirmed', 'cancelled')),
  submitted_at TIMESTAMPTZ DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_registration_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registration_config
CREATE POLICY "Anyone can view registration config"
ON event_registration_config FOR SELECT
USING (true);

CREATE POLICY "Admins and coaches can manage registration config"
ON event_registration_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coach')
  )
);

-- RLS Policies for event_registrations
CREATE POLICY "Users can view their own registrations"
ON event_registrations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins and coaches can view all registrations"
ON event_registrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coach')
  )
);

CREATE POLICY "Users can manage their own registrations"
ON event_registrations FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins and coaches can manage all registrations"
ON event_registrations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coach')
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registration_config_event_id ON event_registration_config(event_id);
