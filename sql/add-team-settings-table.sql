-- Create team_settings table for global app settings
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read team settings"
  ON team_settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update team settings"
  ON team_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- Insert default privacy settings
INSERT INTO team_settings (setting_key, setting_value)
VALUES
  ('privacy_show_attendee_count', 'true'),
  ('privacy_show_attendee_names', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_team_settings_updated_at BEFORE UPDATE ON team_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
