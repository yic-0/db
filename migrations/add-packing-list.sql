-- Add packing list feature for events
-- Admin can set required items per event, members can add personal items (stored client-side)

-- Create packing list items table for admin-defined required items
CREATE TABLE IF NOT EXISTS event_packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'general', -- e.g., 'equipment', 'documents', 'clothing', 'general'
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by event
CREATE INDEX IF NOT EXISTS idx_packing_items_event ON event_packing_items(event_id);

-- Add visibility toggle for packing list on events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_packing_list BOOLEAN DEFAULT true;

-- RLS policies
ALTER TABLE event_packing_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view packing items for events they can see
CREATE POLICY "Users can view packing items" ON event_packing_items
  FOR SELECT USING (true);

-- Only admin/coach can insert/update/delete packing items
CREATE POLICY "Admin can manage packing items" ON event_packing_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
    )
  );

-- Comments
COMMENT ON TABLE event_packing_items IS 'Admin-defined packing list items for events';
COMMENT ON COLUMN event_packing_items.category IS 'Item category: equipment, documents, clothing, general';
COMMENT ON COLUMN event_packing_items.is_required IS 'If true, item is required. If false, recommended.';
COMMENT ON COLUMN events.show_packing_list IS 'Controls whether packing list tab/section is visible to members';
