-- Migration: Add push notification subscriptions and preferences
-- Enables push notifications for practices, events, announcements, etc.

-- Push subscription storage (Web Push API subscription data)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,  -- Public key for encryption
  auth_key TEXT NOT NULL,    -- Auth secret

  -- Device info
  device_name TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one subscription per endpoint per user
  UNIQUE(user_id, endpoint)
);

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification types
  notify_practice_reminders BOOLEAN DEFAULT true,
  notify_practice_changes BOOLEAN DEFAULT true,
  notify_event_reminders BOOLEAN DEFAULT true,
  notify_event_changes BOOLEAN DEFAULT true,
  notify_lineup_published BOOLEAN DEFAULT true,
  notify_announcements BOOLEAN DEFAULT true,
  notify_carpool_updates BOOLEAN DEFAULT true,
  notify_rsvp_reminders BOOLEAN DEFAULT true,

  -- Timing preferences
  practice_reminder_hours INTEGER DEFAULT 24,  -- Hours before practice
  event_reminder_hours INTEGER DEFAULT 48,     -- Hours before event

  -- Quiet hours (local time)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Notification log for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,

  -- Notification content
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT NULL,
  data JSONB DEFAULT NULL,  -- Additional data payload

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'clicked')),
  error_message TEXT DEFAULT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ DEFAULT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON push_subscriptions FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
ON push_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin')
  )
);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own preferences"
ON notification_preferences FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all preferences"
ON notification_preferences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin')
  )
);

-- RLS Policies for notification_log
CREATE POLICY "Users can view their own notifications"
ON notification_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view and manage all notifications"
ON notification_log FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin')
  )
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);

-- Function to auto-create notification preferences when user is created
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences for new users
DROP TRIGGER IF EXISTS on_profile_created_notification_prefs ON profiles;
CREATE TRIGGER on_profile_created_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
