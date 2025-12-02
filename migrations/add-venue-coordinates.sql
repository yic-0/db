-- Add venue coordinates to events table for weather and map features
-- This allows direct coordinate storage instead of relying on geocoding

-- Add venue coordinates to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_lat DECIMAL(10, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_lng DECIMAL(11, 8);

-- Add comments for documentation
COMMENT ON COLUMN events.venue_lat IS 'Latitude of the event venue for weather forecasts and maps';
COMMENT ON COLUMN events.venue_lng IS 'Longitude of the event venue for weather forecasts and maps';
