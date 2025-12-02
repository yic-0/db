-- Add Visibility Toggle for Events and Practices
-- Allows admin/coach/manager to hide/show events and practices from regular members
-- Default: hidden (false) - admin must explicitly make visible

-- Add is_visible_to_members field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_visible_to_members BOOLEAN DEFAULT false;

-- Add is_visible_to_members field to practices table
ALTER TABLE practices ADD COLUMN IF NOT EXISTS is_visible_to_members BOOLEAN DEFAULT false;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(is_visible_to_members);
CREATE INDEX IF NOT EXISTS idx_practices_visibility ON practices(is_visible_to_members);

-- Add comments for documentation
COMMENT ON COLUMN events.is_visible_to_members IS 'Controls whether regular members can see this event. Only admin/coach/manager can toggle. Defaults to false (hidden).';
COMMENT ON COLUMN practices.is_visible_to_members IS 'Controls whether regular members can see this practice. Only admin/coach/manager can toggle. Defaults to false (hidden).';

-- Note: RLS policies remain unchanged
-- Admin/coach/manager can always see all events and practices regardless of visibility
-- Regular members will be filtered in the application layer based on this field
