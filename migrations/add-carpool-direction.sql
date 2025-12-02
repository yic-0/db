-- Add carpool direction field to support one-way rides
-- Values: 'to' (to event only), 'from' (from event only), 'both' (both ways)

-- Add direction field
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS carpool_direction TEXT;

-- Add return same as departure flag
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS carpool_return_same_as_departure BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN event_registrations.carpool_direction IS 'Direction for carpool: to, from, or both';
COMMENT ON COLUMN event_registrations.carpool_return_same_as_departure IS 'If true, return location is same as departure';

-- Also add to event_carpools for drivers offering one-way rides
ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS carpool_direction TEXT DEFAULT 'both';
COMMENT ON COLUMN event_carpools.carpool_direction IS 'Direction driver is offering: to, from, or both';
