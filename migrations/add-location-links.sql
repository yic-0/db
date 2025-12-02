-- Add Location Link Fields to Practices and Events
-- Allows storing a Google Maps or other link for the venue location

-- Add location link to practices
ALTER TABLE practices ADD COLUMN IF NOT EXISTS location_link TEXT;

-- Add location link to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_link TEXT;

-- Comments
COMMENT ON COLUMN practices.location_link IS 'Google Maps or other link to the practice venue location';
COMMENT ON COLUMN events.location_link IS 'Google Maps or other link to the event venue location';
