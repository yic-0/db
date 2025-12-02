-- Add Self Check-in with Geolocation Support
-- Allows members to check themselves in at practices and events
-- Optional geolocation verification to confirm they're actually at the venue

-- Add geolocation columns for check-in verification
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS check_in_lat DECIMAL(10, 8);
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS check_in_lng DECIMAL(11, 8);
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS check_in_accuracy DECIMAL(10, 2); -- GPS accuracy in meters

-- Add venue location to practices for geofencing
ALTER TABLE practices ADD COLUMN IF NOT EXISTS venue_lat DECIMAL(10, 8);
ALTER TABLE practices ADD COLUMN IF NOT EXISTS venue_lng DECIMAL(11, 8);
ALTER TABLE practices ADD COLUMN IF NOT EXISTS check_in_radius INTEGER DEFAULT 500; -- meters, distance allowed for valid check-in

-- Add venue location to events for geofencing
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_lat DECIMAL(10, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_lng DECIMAL(11, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS check_in_radius INTEGER DEFAULT 500; -- meters

-- Create index for check-in queries
CREATE INDEX IF NOT EXISTS idx_rsvps_self_checkin ON rsvps(checked_in_at) WHERE checked_in_by IS NULL;

-- Comments for documentation
COMMENT ON COLUMN rsvps.check_in_lat IS 'Latitude where member checked in (for geolocation verification)';
COMMENT ON COLUMN rsvps.check_in_lng IS 'Longitude where member checked in (for geolocation verification)';
COMMENT ON COLUMN rsvps.check_in_accuracy IS 'GPS accuracy in meters at time of check-in';

COMMENT ON COLUMN practices.venue_lat IS 'Practice venue latitude for geofenced check-in';
COMMENT ON COLUMN practices.venue_lng IS 'Practice venue longitude for geofenced check-in';
COMMENT ON COLUMN practices.check_in_radius IS 'Allowed radius in meters for valid check-in (default 500m)';

COMMENT ON COLUMN events.venue_lat IS 'Event venue latitude for geofenced check-in';
COMMENT ON COLUMN events.venue_lng IS 'Event venue longitude for geofenced check-in';
COMMENT ON COLUMN events.check_in_radius IS 'Allowed radius in meters for valid check-in (default 500m)';

-- Note: Self check-in is identified when checked_in_at IS NOT NULL but checked_in_by IS NULL
-- Admin/coach check-in has both checked_in_at AND checked_in_by set
