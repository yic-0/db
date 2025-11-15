-- Add is_guest column to profiles table
-- This allows tracking guest/temporary paddlers who aren't official team members

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Add index for filtering guests
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);

-- Add comment
COMMENT ON COLUMN profiles.is_guest IS 'True if this is a guest/temporary paddler, false for regular team members';
