-- Add is_draft column to rsvps table for admin-created pre-fill registrations
-- When an admin pre-fills a member's carpool location, is_draft = true
-- When the member officially registers themselves, they can update and set is_draft = false

ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

COMMENT ON COLUMN rsvps.is_draft IS 'True if this registration was pre-filled by an admin before the member registered themselves';

-- Index for filtering draft registrations
CREATE INDEX IF NOT EXISTS idx_rsvps_is_draft ON rsvps(is_draft) WHERE is_draft = true;
