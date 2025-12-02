-- Add visibility toggle fields for event features
-- Allows admin/coach to show/hide Carpools tab and Accommodation section per event

-- Carpool tab visibility (default true - show carpools)
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_carpools BOOLEAN DEFAULT true;

-- Accommodation section visibility (default false - hide until configured)
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_accommodation BOOLEAN DEFAULT false;

-- Accommodation data stored as JSONB for flexibility
-- Structure: { hotels: [{ name, address, lat, lng, link, rooms: [{ room_number, occupants: [user_id, ...] }] }] }
ALTER TABLE events ADD COLUMN IF NOT EXISTS accommodation JSONB DEFAULT '{"hotels": []}'::jsonb;

-- External photo album link (Google Photos, Apple Photos, etc.)
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_album_url TEXT;

-- Comments
COMMENT ON COLUMN events.show_carpools IS 'Toggle visibility of Carpools tab for this event';
COMMENT ON COLUMN events.show_accommodation IS 'Toggle visibility of Accommodation section for this event';
COMMENT ON COLUMN events.accommodation IS 'JSON data for hotel/accommodation assignments';
COMMENT ON COLUMN events.external_album_url IS 'Link to external photo album (Google Photos, etc.)';
