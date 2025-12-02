-- Add Food Location Fields to Practices and Events
-- Allows specifying a post-activity food meetup location

-- Add food location to practices
ALTER TABLE practices ADD COLUMN IF NOT EXISTS food_location_name TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS food_location_link TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS food_location_lat DECIMAL(10, 8);
ALTER TABLE practices ADD COLUMN IF NOT EXISTS food_location_lng DECIMAL(11, 8);

-- Add food location to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS food_location_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS food_location_link TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS food_location_lat DECIMAL(10, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS food_location_lng DECIMAL(11, 8);

-- Comments
COMMENT ON COLUMN practices.food_location_name IS 'Name of the post-practice food meetup location';
COMMENT ON COLUMN practices.food_location_link IS 'Google Maps or other link to the food location';
COMMENT ON COLUMN practices.food_location_lat IS 'Latitude of food location (auto-extracted from link)';
COMMENT ON COLUMN practices.food_location_lng IS 'Longitude of food location (auto-extracted from link)';

COMMENT ON COLUMN events.food_location_name IS 'Name of the post-event food meetup location';
COMMENT ON COLUMN events.food_location_link IS 'Google Maps or other link to the food location';
COMMENT ON COLUMN events.food_location_lat IS 'Latitude of food location (auto-extracted from link)';
COMMENT ON COLUMN events.food_location_lng IS 'Longitude of food location (auto-extracted from link)';
