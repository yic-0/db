-- Add visibility toggle to event_carpools table

ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

COMMENT ON COLUMN event_carpools.is_visible IS 'Controls whether carpool is visible to regular paddlers. Admins/coaches always see all carpools.';
