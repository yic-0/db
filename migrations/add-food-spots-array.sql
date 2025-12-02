-- Add food_spots JSONB column for multiple post-event food locations
-- Each food spot can have: name, link, reservation_time, notes

ALTER TABLE events ADD COLUMN IF NOT EXISTS food_spots JSONB DEFAULT '[]'::jsonb;

-- Comment on the column
COMMENT ON COLUMN events.food_spots IS 'Array of post-event food spots. Each spot has: name, link, reservation_time, notes';

-- Example structure:
-- [
--   {
--     "name": "Pho Express",
--     "link": "https://maps.google.com/...",
--     "reservation_time": "18:00",
--     "notes": "Reservation for 20 people"
--   },
--   {
--     "name": "Tim Hortons",
--     "link": null,
--     "reservation_time": null,
--     "notes": "Quick stop for coffee"
--   }
-- ]
