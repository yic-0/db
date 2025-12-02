-- Add RSVP Visibility Controls for Practices
-- 1. Restrict regular paddlers to only see "yes" RSVPs (not "no" or "maybe")
-- 2. Add time-based visibility control - admin/coach can set when RSVPs become visible to paddlers

-- Add rsvp_visibility_hours field to practices table
-- NULL or 0 = visible immediately (day of practice at 00:00)
-- Positive number = visible X hours before practice start time
-- For example: 24 = visible 1 day before, 168 = visible 1 week before
ALTER TABLE practices ADD COLUMN IF NOT EXISTS rsvp_visibility_hours INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN practices.rsvp_visibility_hours IS 'Number of hours before practice when RSVPs become visible to regular paddlers. 0 or NULL = day of practice (default), positive number = X hours before start time';

-- Note: The "paddlers only see yes" restriction will be implemented in the application layer
-- Admin/coach/manager can always see all RSVPs (yes/no/maybe) regardless of visibility settings
