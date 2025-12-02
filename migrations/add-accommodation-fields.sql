-- Add accommodation fields to events table for multi-day events

ALTER TABLE events ADD COLUMN IF NOT EXISTS accommodation_info TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS accommodation_address TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS accommodation_checkin TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS accommodation_checkout TEXT;

-- Add comments
COMMENT ON COLUMN events.accommodation_info IS 'Hotel/accommodation information and notes';
COMMENT ON COLUMN events.accommodation_address IS 'Full address of accommodation';
COMMENT ON COLUMN events.accommodation_checkin IS 'Check-in time or date/time';
COMMENT ON COLUMN events.accommodation_checkout IS 'Check-out time or date/time';
