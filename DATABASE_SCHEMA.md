# Database Schema - Dragon Boat Team Manager

## Phase 1 MVP Tables

### 1. profiles (extends Supabase auth.users)
Stores additional user profile information beyond authentication.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  -- Dragon boat specific
  preferred_side TEXT CHECK (preferred_side IN ('left', 'right', 'either')),
  preferred_positions INTEGER[], -- Array of seat numbers (1-10)
  skill_level TEXT CHECK (skill_level IN ('novice', 'intermediate', 'advanced', 'competitive')),
  weight_kg DECIMAL(5,2), -- For boat balancing
  height_cm INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'coach', 'captain', 'steersperson', 'member')),

  -- Medical (optional)
  medical_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. practices
Stores practice/training sessions.

```sql
CREATE TABLE practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  practice_type TEXT CHECK (practice_type IN ('water', 'land', 'gym', 'meeting')) DEFAULT 'water',

  -- Schedule
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,

  -- Location
  location_name TEXT NOT NULL,
  location_address TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),

  -- Capacity
  max_capacity INTEGER DEFAULT 22, -- 20 paddlers + 1 steersperson + 1 drummer

  -- Status
  status TEXT CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
  cancellation_reason TEXT,

  -- RSVP deadline
  rsvp_deadline TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_practices_date ON practices(date DESC);
CREATE INDEX idx_practices_status ON practices(status);
```

### 3. rsvps
Tracks who's attending each practice.

```sql
CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Response
  status TEXT CHECK (status IN ('yes', 'no', 'maybe')) NOT NULL,
  notes TEXT, -- e.g., "arriving 15 min late"

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one RSVP per user per practice
  UNIQUE(practice_id, user_id)
);

-- Indexes
CREATE INDEX idx_rsvps_practice ON rsvps(practice_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);
CREATE INDEX idx_rsvps_status ON rsvps(status);
```

### 4. lineups
Stores boat lineup configurations.

```sql
CREATE TABLE lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "Saturday Practice - Balanced", "Regatta A-Boat"
  practice_id UUID REFERENCES practices(id) ON DELETE SET NULL,

  -- Lineup data (JSONB for flexibility)
  positions JSONB NOT NULL, -- {left: [user_ids], right: [user_ids], steersperson: user_id, drummer: user_id}

  -- Metadata
  notes TEXT,
  is_template BOOLEAN DEFAULT false, -- Can be reused

  -- Performance tracking
  piece_time_seconds INTEGER, -- e.g., 500m time

  -- Timestamps
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example JSONB structure:
-- {
--   "left": ["uuid1", "uuid2", "uuid3", ...],  // 10 paddlers
--   "right": ["uuid11", "uuid12", ...],        // 10 paddlers
--   "steersperson": "uuid_steers",
--   "drummer": "uuid_drummer"
-- }

CREATE INDEX idx_lineups_practice ON lineups(practice_id);
```

### 5. announcements
Team-wide announcements and messages.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',

  -- Targeting
  target_roles TEXT[], -- NULL means everyone, or ['coach', 'captain']

  -- Notifications
  send_email BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
```

### 6. attendance_records
Actual attendance (vs RSVP promises) - auto-populated from RSVPs initially.

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Attendance
  attended BOOLEAN NOT NULL,
  marked_by UUID REFERENCES profiles(id), -- Coach who marked attendance

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(practice_id, user_id)
);

CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_practice ON attendance_records(practice_id);
```

---

## Row Level Security (RLS) Policies

Supabase uses PostgreSQL's RLS to control data access. Here are the key policies:

### profiles
- **SELECT**: Everyone can view active profiles
- **INSERT**: Only on own profile during signup
- **UPDATE**: Users can update own profile; admins can update any
- **DELETE**: Only admins

### practices
- **SELECT**: Everyone can view
- **INSERT**: Only coaches and admins
- **UPDATE**: Only coaches and admins
- **DELETE**: Only admins

### rsvps
- **SELECT**: Everyone can view all RSVPs
- **INSERT**: Authenticated users can RSVP
- **UPDATE**: Users can update own RSVP
- **DELETE**: Users can delete own RSVP

### lineups
- **SELECT**: Everyone can view
- **INSERT**: Only coaches, captains, and admins
- **UPDATE**: Only creator, coaches, and admins
- **DELETE**: Only creator and admins

### announcements
- **SELECT**: Everyone can view
- **INSERT**: Only admins and coaches
- **UPDATE**: Only creator and admins
- **DELETE**: Only creator and admins

### attendance_records
- **SELECT**: Everyone can view
- **INSERT**: Only coaches and admins
- **UPDATE**: Only coaches and admins
- **DELETE**: Only admins

---

## Database Functions & Triggers

### 1. Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practices_updated_at BEFORE UPDATE ON practices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (repeat for other tables)
```

### 2. Calculate attendance reliability score

```sql
CREATE OR REPLACE FUNCTION calculate_reliability_score(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_rsvps INTEGER;
  kept_promises INTEGER;
BEGIN
  -- Count RSVPs where user said 'yes'
  SELECT COUNT(*) INTO total_rsvps
  FROM rsvps r
  JOIN practices p ON r.practice_id = p.id
  WHERE r.user_id = user_uuid
    AND r.status = 'yes'
    AND p.status = 'completed';

  -- Count how many they actually attended
  SELECT COUNT(*) INTO kept_promises
  FROM attendance_records a
  JOIN practices p ON a.practice_id = p.id
  WHERE a.user_id = user_uuid
    AND a.attended = true
    AND p.status = 'completed';

  -- Return percentage
  IF total_rsvps = 0 THEN
    RETURN 100.0;
  ELSE
    RETURN ROUND((kept_promises::DECIMAL / total_rsvps) * 100, 1);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## Initial Data / Seed Data

After creating tables, insert:

1. **Admin user** (your profile)
2. **Sample practice locations**
3. **System announcements**

---

## Scaling Considerations (100+ users)

- **Indexes**: Already included on foreign keys and date columns
- **Partitioning**: Not needed until 10,000+ practices
- **Caching**: Supabase handles this automatically
- **Connection pooling**: Built into Supabase
- **Backups**: Automatic daily backups on Supabase

---

## Phase 2 Tables (Future)

- `races` - Regatta and race information
- `race_entries` - Team registrations for races
- `equipment` - Inventory management
- `payments` - Financial tracking
- `messages` - Direct messaging between users
