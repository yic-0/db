-- Add carpool coordinate fields to rsvps table
-- This is needed for the unified RSVP system (previously columns existed only on event_registrations)

-- Add carpool location and direction fields
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_needs VARCHAR(50); -- 'need_ride', 'can_drive', 'not_needed'
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_direction VARCHAR(20) DEFAULT 'both'; -- 'to', 'from', 'both'

-- Add departure (pickup) location and coordinates
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_departure_location TEXT;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_departure_lat DECIMAL(10, 8);
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_departure_lng DECIMAL(11, 8);

-- Add return (dropoff) location and coordinates
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_return_location TEXT;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_return_lat DECIMAL(10, 8);
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_return_lng DECIMAL(11, 8);

-- Flag for same return location as departure
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_return_same_as_departure BOOLEAN DEFAULT false;

-- Add seats available for drivers
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS carpool_seats_available INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN rsvps.carpool_needs IS 'Carpool preference: need_ride, can_drive, not_needed';
COMMENT ON COLUMN rsvps.carpool_direction IS 'Carpool direction: to (to event only), from (from event only), both';
COMMENT ON COLUMN rsvps.carpool_departure_location IS 'Text address for pickup/departure location';
COMMENT ON COLUMN rsvps.carpool_departure_lat IS 'Latitude of pickup/departure location';
COMMENT ON COLUMN rsvps.carpool_departure_lng IS 'Longitude of pickup/departure location';
COMMENT ON COLUMN rsvps.carpool_return_location IS 'Text address for dropoff/return location';
COMMENT ON COLUMN rsvps.carpool_return_lat IS 'Latitude of dropoff/return location';
COMMENT ON COLUMN rsvps.carpool_return_lng IS 'Longitude of dropoff/return location';
COMMENT ON COLUMN rsvps.carpool_return_same_as_departure IS 'If true, return location is same as departure';
COMMENT ON COLUMN rsvps.carpool_seats_available IS 'Number of seats available if member can drive';

-- Create index for carpool queries
CREATE INDEX IF NOT EXISTS idx_rsvps_carpool_needs ON rsvps(carpool_needs) WHERE carpool_needs IS NOT NULL;
