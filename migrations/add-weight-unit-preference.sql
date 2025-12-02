-- Add Weight Unit Preference to Profiles
-- Allow users to choose between lbs and kg for weight display

-- Add weight_unit column with default 'lbs'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(3) DEFAULT 'lbs'
  CHECK (weight_unit IN ('lbs', 'kg'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.weight_unit IS 'User preference for weight display unit (lbs or kg). Weight is always stored in kg.';

-- Note: weight_kg column stores the actual weight in kilograms
-- The weight_unit preference is only for display/input purposes
