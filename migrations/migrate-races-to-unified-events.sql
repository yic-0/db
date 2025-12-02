-- Migration: Unify prospective_races and confirmed_races into events table
-- This creates a single source of truth for all races and events

-- Step 1: Migrate prospective_races to events table
INSERT INTO events (
  id,
  title,
  event_type,
  description,
  location,
  event_date,
  registration_deadline,
  status,
  notes,
  event_url,
  created_by,
  created_at,
  updated_at
)
SELECT
  id,
  name AS title,
  'race' AS event_type,
  description,
  location,
  race_date AS event_date,
  registration_deadline,
  CASE
    WHEN status = 'prospective' THEN 'planning'
    WHEN status = 'confirmed' THEN 'confirmed'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'planning'
  END AS status,
  CONCAT_WS(
    E'\n\n',
    notes,
    CASE WHEN estimated_cost IS NOT NULL THEN 'Estimated cost: $' || estimated_cost ELSE NULL END,
    CASE WHEN early_bird_cost IS NOT NULL THEN 'Early bird cost: $' || early_bird_cost ELSE NULL END,
    CASE WHEN early_bird_deadline IS NOT NULL THEN 'Early bird deadline: ' || early_bird_deadline ELSE NULL END,
    CASE WHEN payment_deadline IS NOT NULL THEN 'Payment deadline: ' || payment_deadline ELSE NULL END
  ) AS notes,
  external_link AS event_url,
  created_by,
  created_at,
  NOW() AS updated_at
FROM prospective_races
ON CONFLICT (id) DO NOTHING;

-- Step 2: Migrate confirmed_races to events table
INSERT INTO events (
  id,
  title,
  event_type,
  description,
  location,
  event_date,
  start_time,
  end_time,
  captains_meeting_time,
  registration_deadline,
  status,
  notes,
  event_url,
  created_by,
  created_at,
  updated_at
)
SELECT
  id,
  name AS title,
  'race' AS event_type,
  description,
  COALESCE(location || CASE WHEN venue_address IS NOT NULL THEN E'\n' || venue_address ELSE '' END, location, venue_address) AS location,
  race_date AS event_date,
  race_start_time AS start_time,
  race_end_time AS end_time,
  captains_meeting_date::TIME AS captains_meeting_time,
  lineup_submission_deadline AS registration_deadline,
  'confirmed' AS status,
  CONCAT_WS(
    E'\n\n',
    registration_notes,
    notes,
    CASE WHEN total_cost IS NOT NULL THEN 'Total cost: $' || total_cost ELSE NULL END,
    CASE WHEN per_person_cost IS NOT NULL THEN 'Per person cost: $' || per_person_cost ELSE NULL END,
    CASE WHEN payment_status IS NOT NULL THEN 'Payment status: ' || payment_status ELSE NULL END,
    CASE WHEN payment_due_date IS NOT NULL THEN 'Payment due: ' || payment_due_date ELSE NULL END,
    CASE WHEN team_briefing_date IS NOT NULL THEN 'Team briefing: ' || team_briefing_date ELSE NULL END
  ) AS notes,
  external_link AS event_url,
  created_by,
  created_at,
  NOW() AS updated_at
FROM confirmed_races
ON CONFLICT (id) DO NOTHING;

-- Step 3: Migrate race_participants to event_rsvps
INSERT INTO event_rsvps (
  id,
  event_id,
  user_id,
  status,
  response_notes,
  registered_at,
  updated_at
)
SELECT
  gen_random_uuid() AS id,
  confirmed_race_id AS event_id,
  user_id,
  CASE
    WHEN status = 'interested' THEN 'interested'
    WHEN status = 'committed' THEN 'confirmed'
    WHEN status = 'not_interested' THEN 'declined'
    WHEN status = 'confirmed' THEN 'confirmed'
    WHEN status = 'declined' THEN 'declined'
    ELSE 'interested'
  END AS status,
  notes AS response_notes,
  created_at AS registered_at,
  NOW() AS updated_at
FROM race_participants
WHERE confirmed_race_id IN (SELECT id FROM confirmed_races)
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Step 4: Create a view for backwards compatibility (optional - can be removed later)
CREATE OR REPLACE VIEW legacy_prospective_races AS
SELECT
  id,
  title AS name,
  location,
  description,
  event_date AS race_date,
  registration_deadline,
  status,
  notes,
  event_url AS external_link,
  created_by,
  created_at,
  updated_at
FROM events
WHERE event_type = 'race' AND status IN ('planning', 'prospective');

CREATE OR REPLACE VIEW legacy_confirmed_races AS
SELECT
  id,
  title AS name,
  location,
  description,
  event_date AS race_date,
  start_time AS race_start_time,
  end_time AS race_end_time,
  captains_meeting_time,
  status,
  notes,
  event_url AS external_link,
  created_by,
  created_at,
  updated_at
FROM events
WHERE event_type = 'race' AND status IN ('confirmed', 'registration_open', 'in_progress', 'completed');

-- Step 5: Drop old tables (COMMENTED OUT - uncomment after verifying migration)
-- WARNING: Only run this after confirming all data is migrated correctly!
-- DROP TABLE IF EXISTS race_participants CASCADE;
-- DROP TABLE IF EXISTS confirmed_races CASCADE;
-- DROP TABLE IF EXISTS prospective_races CASCADE;

-- Add helpful comments
COMMENT ON TABLE events IS 'Unified table for all team events including races, regattas, practices, and social events';
COMMENT ON COLUMN events.status IS 'Event status: planning, registration_open, confirmed, in_progress, completed, cancelled';
COMMENT ON COLUMN events.event_type IS 'Type of event: race, regatta, hiking, social, training_camp, other';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Races have been unified into the events table.';
  RAISE NOTICE 'Legacy views created for backwards compatibility: legacy_prospective_races, legacy_confirmed_races';
  RAISE NOTICE 'After verifying the migration, you can uncomment and run the DROP TABLE statements.';
END $$;
