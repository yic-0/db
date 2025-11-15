# Supabase Setup Guide

This guide walks you through setting up Supabase for the Dragon Boat Team Manager app.

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign in with GitHub (recommended) or email
4. Click "New Project"
5. Fill in the details:
   - **Organization**: Create new or select existing
   - **Name**: `dragon-boat-team-manager`
   - **Database Password**: Use a strong password (save it somewhere safe!)
   - **Region**: Choose the region closest to your team (e.g., US West, US East, Europe, Asia)
   - **Pricing Plan**: Free tier is perfect to start (up to 500MB database, 1GB storage)
6. Click "Create new project"
7. Wait 2-3 minutes for setup to complete

## Step 2: Get Your API Credentials

1. In your project dashboard, click the **Settings** icon (⚙️) in the left sidebar
2. Click **API**
3. You'll see two important values:

   **Project URL**:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon/public key** (under "Project API keys"):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
   ```

4. Copy both values - you'll need them for the `.env` file

## Step 3: Configure Your App

1. In your project folder, create a `.env` file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and paste your credentials:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
   ```

3. Save the file

## Step 4: Create Database Tables

### Option A: Quick Setup (Recommended)

1. In Supabase dashboard, click **SQL Editor** icon
2. Click **New Query**
3. Copy and paste the SQL below:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  preferred_side TEXT CHECK (preferred_side IN ('left', 'right', 'either')),
  preferred_positions INTEGER[],
  skill_level TEXT CHECK (skill_level IN ('novice', 'intermediate', 'advanced', 'competitive')),
  weight_kg DECIMAL(5,2),
  height_cm INTEGER,

  is_active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'coach', 'captain', 'steersperson', 'member')),
  medical_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRACTICES TABLE
CREATE TABLE practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  practice_type TEXT CHECK (practice_type IN ('water', 'land', 'gym', 'meeting')) DEFAULT 'water',

  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,

  location_name TEXT NOT NULL,
  location_address TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),

  max_capacity INTEGER DEFAULT 22,
  status TEXT CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
  cancellation_reason TEXT,
  rsvp_deadline TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practices_date ON practices(date DESC);
CREATE INDEX idx_practices_status ON practices(status);

-- RSVPS TABLE
CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('yes', 'no', 'maybe')) NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(practice_id, user_id)
);

CREATE INDEX idx_rsvps_practice ON rsvps(practice_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);
CREATE INDEX idx_rsvps_status ON rsvps(status);

-- LINEUPS TABLE
CREATE TABLE lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  practice_id UUID REFERENCES practices(id) ON DELETE SET NULL,
  positions JSONB NOT NULL,
  notes TEXT,
  is_template BOOLEAN DEFAULT false,
  piece_time_seconds INTEGER,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lineups_practice ON lineups(practice_id);

-- ANNOUNCEMENTS TABLE
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  target_roles TEXT[],
  send_email BOOLEAN DEFAULT false,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

-- ATTENDANCE RECORDS TABLE
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL,
  marked_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(practice_id, user_id)
);

CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_practice ON attendance_records(practice_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practices_updated_at BEFORE UPDATE ON practices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvps_updated_at BEFORE UPDATE ON rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lineups_updated_at BEFORE UPDATE ON lineups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

### Option B: Manual Setup

Follow the SQL commands in `DATABASE_SCHEMA.md` and run each table creation separately.

## Step 5: Set Up Row Level Security (RLS)

This is CRITICAL for security! Run this SQL:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- PRACTICES POLICIES
CREATE POLICY "Practices are viewable by everyone"
  ON practices FOR SELECT
  USING (true);

CREATE POLICY "Only admins/coaches can create practices"
  ON practices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'captain')
    )
  );

CREATE POLICY "Only admins/coaches can update practices"
  ON practices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'captain')
    )
  );

-- RSVPS POLICIES
CREATE POLICY "RSVPs are viewable by everyone"
  ON rsvps FOR SELECT
  USING (true);

CREATE POLICY "Users can create own RSVP"
  ON rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVP"
  ON rsvps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSVP"
  ON rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- LINEUPS POLICIES
CREATE POLICY "Lineups are viewable by everyone"
  ON lineups FOR SELECT
  USING (true);

CREATE POLICY "Coaches/captains can create lineups"
  ON lineups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'captain')
    )
  );

-- ANNOUNCEMENTS POLICIES
CREATE POLICY "Announcements are viewable by everyone"
  ON announcements FOR SELECT
  USING (true);

CREATE POLICY "Admins/coaches can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- ATTENDANCE POLICIES
CREATE POLICY "Attendance is viewable by everyone"
  ON attendance_records FOR SELECT
  USING (true);

CREATE POLICY "Coaches can manage attendance"
  ON attendance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );
```

## Step 6: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Configure email settings:
   - **Enable Email Confirmations**: ON (recommended)
   - **Email Templates**: Customize if desired
3. Under **Auth Providers**:
   - Email is enabled by default
   - Optionally enable Google/GitHub for social login

## Step 7: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000

3. Click "Sign Up" and create a test account

4. Check Supabase → **Authentication** → **Users** to see your new user

5. Go to **Table Editor** → **profiles** to see your profile row

6. Change your `role` to `admin`:
   - Click on your profile row
   - Change `role` from `member` to `admin`
   - Click "Save"

## Step 8: Optional - Add Sample Data

To test the app with sample data:

```sql
-- Add a sample practice
INSERT INTO practices (title, description, practice_type, date, start_time, location_name, created_by)
VALUES (
  'Saturday Morning Practice',
  'Regular water practice - focus on timing',
  'water',
  '2025-11-15',
  '08:00:00',
  'Lake Marina',
  'your-user-id-here'  -- Replace with your actual user ID from auth.users
);
```

## Troubleshooting

### "Invalid API key" error
- Double-check you copied the **anon/public** key, not the service_role key
- Make sure there are no extra spaces in `.env`

### Can't insert data
- Make sure RLS policies are set up correctly
- Check that you're logged in
- Verify your user's role in the profiles table

### Email confirmation not working
- Check Supabase → Authentication → Settings → Email Auth
- For development, you can disable email confirmation temporarily

## Database Backup

Supabase automatically backs up your database daily. To manually backup:

1. Go to **Settings** → **Database**
2. Scroll to "Connection string"
3. Use `pg_dump` command to backup (requires PostgreSQL installed locally)

## Next Steps

✅ Supabase is set up!
✅ Database tables created
✅ Security policies enabled
✅ App is connected

Now you can start using the app and developing new features!

See `README.md` for development instructions.
