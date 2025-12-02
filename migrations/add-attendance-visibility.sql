-- Add visibility control for attendance/team makeup
-- Allows admin/coach to control when paddlers can see who is going to the event

-- Add visibility field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_attendance_to_members BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN events.show_attendance_to_members IS 'Controls whether regular members can see the attendance list (who is going). Default true - visible to all.';
