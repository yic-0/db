-- Add Food RSVP to Event Registrations
-- Allows paddlers to RSVP for post-race/post-event food in the registration form

-- Add food_rsvp field to event_registrations table
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS food_rsvp BOOLEAN DEFAULT NULL;

-- Add food_rsvp configuration to event_registration_config table
ALTER TABLE event_registration_config ADD COLUMN IF NOT EXISTS show_food_rsvp BOOLEAN DEFAULT false;
ALTER TABLE event_registration_config ADD COLUMN IF NOT EXISTS require_food_rsvp BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN event_registrations.food_rsvp IS 'Whether the paddler will attend post-event food. NULL = not answered, true = yes, false = no';
COMMENT ON COLUMN event_registration_config.show_food_rsvp IS 'Whether to show the food RSVP question in the registration form';
COMMENT ON COLUMN event_registration_config.require_food_rsvp IS 'Whether the food RSVP question is required';
