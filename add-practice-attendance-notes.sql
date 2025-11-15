-- Add attendance tracking and notes to practices
-- Run this in Supabase SQL Editor

-- Add practice notes column to practices table
ALTER TABLE practices
ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- Add attendance tracking columns to rsvps table
ALTER TABLE rsvps
ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS member_notes TEXT,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES profiles(id);

-- Create index for faster attendance queries
CREATE INDEX IF NOT EXISTS idx_rsvps_attended ON rsvps(practice_id, attended);

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'practices' AND column_name = 'coach_notes';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rsvps' AND column_name IN ('attended', 'member_notes', 'checked_in_at', 'checked_in_by');
