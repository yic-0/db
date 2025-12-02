-- Add coordinator sub-roles for delegated permissions
-- Allows certain members to have elevated access for specific areas

-- Add sub_role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sub_role VARCHAR(50);

-- Create an enum-like constraint for valid sub_roles
ALTER TABLE profiles ADD CONSTRAINT profiles_sub_role_check
  CHECK (sub_role IS NULL OR sub_role IN (
    'event_coordinator',      -- Can manage events, races, carpools
    'social_coordinator',      -- Can manage announcements, social events
    'equipment_coordinator',   -- Can manage equipment, logistics
    'training_coordinator',    -- Can manage practices, workouts, training plans
    'communications_coordinator' -- Can manage announcements, communications
  ));

-- Add index for filtering by sub_role
CREATE INDEX IF NOT EXISTS idx_profiles_sub_role ON profiles(sub_role);

-- Add comment
COMMENT ON COLUMN profiles.sub_role IS 'Optional coordinator role for delegated permissions (event_coordinator, social_coordinator, equipment_coordinator, training_coordinator, communications_coordinator)';

-- Update RLS policies to allow coordinators certain permissions
-- We'll handle coordinator-specific permissions in the application layer
-- but ensure they can update their own profiles
