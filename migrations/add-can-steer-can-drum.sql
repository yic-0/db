-- Add can_steer and can_drum columns to profiles table
-- These indicate special skills/certifications for steering and drumming

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_steer BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_drum BOOLEAN DEFAULT FALSE;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_can_steer ON profiles(can_steer);
CREATE INDEX IF NOT EXISTS idx_profiles_can_drum ON profiles(can_drum);

-- Add comments
COMMENT ON COLUMN profiles.can_steer IS 'True if member is qualified/certified to steer the boat';
COMMENT ON COLUMN profiles.can_drum IS 'True if member is qualified/certified to drum';
