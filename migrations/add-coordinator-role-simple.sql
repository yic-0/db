-- Add simple coordinator flag for delegated permissions
-- Coordinators can help with certain tasks without needing full coach/admin access

-- Add is_coordinator column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_coordinator BOOLEAN DEFAULT false;

-- Add index for filtering by coordinator status
CREATE INDEX IF NOT EXISTS idx_profiles_is_coordinator ON profiles(is_coordinator);

-- Add comment
COMMENT ON COLUMN profiles.is_coordinator IS 'True if this member has coordinator privileges for delegated tasks (announcements, events, etc.)';
