-- Add Attendance Tracking and Member Notes to RSVPs
-- This migration adds columns for tracking attendance and coach notes per member

-- Add attendance tracking columns
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT false;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS member_notes TEXT;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_rsvps_attended ON rsvps(attended) WHERE attended = true;
CREATE INDEX IF NOT EXISTS idx_rsvps_checked_in_at ON rsvps(checked_in_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN rsvps.attended IS 'Whether the member actually attended the practice';
COMMENT ON COLUMN rsvps.member_notes IS 'Coach notes about this member for this specific practice';
COMMENT ON COLUMN rsvps.checked_in_at IS 'Timestamp when the member was marked as attended';
COMMENT ON COLUMN rsvps.checked_in_by IS 'Coach/admin who marked the member as attended';

-- Note: The 'notes' column remains for member's own RSVP notes
-- The 'member_notes' column is for coach observations about the member
