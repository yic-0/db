-- Add coordinate fields to event_carpools for map visualization
-- This allows admins to see carpool departure locations on a map

-- Add departure coordinates to event_carpools table
ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS departure_lat DECIMAL(10, 8);
ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS departure_lng DECIMAL(11, 8);
ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS departure_location_link TEXT;

-- Add comments for documentation
COMMENT ON COLUMN event_carpools.departure_lat IS 'Latitude of the carpool departure location';
COMMENT ON COLUMN event_carpools.departure_lng IS 'Longitude of the carpool departure location';
COMMENT ON COLUMN event_carpools.departure_location_link IS 'Google Maps link for the departure location';
