-- Add return location columns to event_carpools table
-- These columns store where the carpool returns to after the event (may be different from pickup)

ALTER TABLE event_carpools
ADD COLUMN IF NOT EXISTS final_location TEXT,
ADD COLUMN IF NOT EXISTS final_location_link TEXT,
ADD COLUMN IF NOT EXISTS final_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS final_lng DECIMAL(11, 8);

-- Add comments for documentation
COMMENT ON COLUMN event_carpools.final_location IS 'Return location address text after event';
COMMENT ON COLUMN event_carpools.final_location_link IS 'Google Maps or other link for return location';
COMMENT ON COLUMN event_carpools.final_lat IS 'Return location latitude';
COMMENT ON COLUMN event_carpools.final_lng IS 'Return location longitude';
