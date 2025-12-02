-- Create user_saved_locations table for storing user's frequently used locations
-- These locations can be used to prepopulate pickup/dropoff in event registration

CREATE TABLE IF NOT EXISTS user_saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g., 'Home', 'Work', 'Gym', 'Parent's House'
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  is_default BOOLEAN DEFAULT false, -- Mark one location as default for prepopulation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique labels per user
  UNIQUE(user_id, label)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_saved_locations_user_id ON user_saved_locations(user_id);

-- Add RLS policies
ALTER TABLE user_saved_locations ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved locations
CREATE POLICY "Users can view own saved locations"
  ON user_saved_locations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own saved locations
CREATE POLICY "Users can insert own saved locations"
  ON user_saved_locations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved locations
CREATE POLICY "Users can update own saved locations"
  ON user_saved_locations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own saved locations
CREATE POLICY "Users can delete own saved locations"
  ON user_saved_locations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE user_saved_locations IS 'Stores user frequently used locations for carpool pickup/dropoff';
COMMENT ON COLUMN user_saved_locations.label IS 'User-friendly name like Home, Work, etc.';
COMMENT ON COLUMN user_saved_locations.is_default IS 'If true, this location is auto-selected for new registrations';

-- Also add a default_location_id to profiles for quick prepopulation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES user_saved_locations(id) ON DELETE SET NULL;
COMMENT ON COLUMN profiles.default_location_id IS 'Default saved location for carpool prepopulation';
