-- Add photos array and instructions fields to events table

-- Photos stored as an array of objects with url, caption, uploaded_by, uploaded_at
ALTER TABLE events ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Instructions field for race day logistics
ALTER TABLE events ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Create storage bucket for event photos (if not exists)
-- Note: This needs to be run in Supabase dashboard or via CLI
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('event-photos', 'event-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON COLUMN events.photos IS 'Array of photo objects with url, caption, uploaded_by, uploaded_at';
COMMENT ON COLUMN events.instructions IS 'Race day instructions and logistics information';

-- RLS for storage (run in Supabase dashboard)
-- CREATE POLICY "Anyone can view event photos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'event-photos');

-- CREATE POLICY "Admins and coaches can upload event photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'event-photos'
--   AND EXISTS (
--     SELECT 1 FROM profiles
--     WHERE id = auth.uid()
--     AND (role = 'admin' OR role = 'coach')
--   )
-- );

-- CREATE POLICY "Admins and coaches can delete event photos"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'event-photos'
--   AND EXISTS (
--     SELECT 1 FROM profiles
--     WHERE id = auth.uid()
--     AND (role = 'admin' OR role = 'coach')
--   )
-- );
