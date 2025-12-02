-- Add coordinate fields to event_registrations for carpool pickup/dropoff locations
-- This allows showing pickup locations on maps

-- Add departure (pickup) coordinates
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS carpool_departure_lat DECIMAL(10, 8);
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS carpool_departure_lng DECIMAL(11, 8);

-- Add return (dropoff) coordinates
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS carpool_return_lat DECIMAL(10, 8);
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS carpool_return_lng DECIMAL(11, 8);

-- Add comments for documentation
COMMENT ON COLUMN event_registrations.carpool_departure_lat IS 'Latitude of pickup location for carpool';
COMMENT ON COLUMN event_registrations.carpool_departure_lng IS 'Longitude of pickup location for carpool';
COMMENT ON COLUMN event_registrations.carpool_return_lat IS 'Latitude of dropoff location for carpool';
COMMENT ON COLUMN event_registrations.carpool_return_lng IS 'Longitude of dropoff location for carpool';
