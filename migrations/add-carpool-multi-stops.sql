-- Migration: Add multi-stop support for carpools
-- Adds start/end locations and optional pickup/dropoff stops

-- Rename departure_location to start_location for clarity (keeping for backwards compatibility)
-- departure_location will continue to work, but we'll add start_location as preferred

-- Add final destination
ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS final_destination VARCHAR(500);

-- Add pickup stops as JSONB array [{location: string, time: string (optional)}]
ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS pickup_stops JSONB DEFAULT '[]'::jsonb;

-- Add dropoff stops as JSONB array [{location: string}]
ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS dropoff_stops JSONB DEFAULT '[]'::jsonb;

-- Comments for documentation
COMMENT ON COLUMN event_carpools.departure_location IS 'Starting location for the carpool (where driver leaves from)';
COMMENT ON COLUMN event_carpools.final_destination IS 'Final destination (typically the event venue)';
COMMENT ON COLUMN event_carpools.pickup_stops IS 'Array of intermediate pickup stops: [{location: string, time: string}]';
COMMENT ON COLUMN event_carpools.dropoff_stops IS 'Array of dropoff stops on return trip: [{location: string}]';
