-- Workouts System for Member Fitness Tracking
-- Track individual workouts, challenges, training programs, and progress

-- Workout Categories/Types
CREATE TABLE IF NOT EXISTS workout_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji or icon identifier
  color VARCHAR(50), -- for UI theming
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-populate common workout types
INSERT INTO workout_types (name, description, icon, color) VALUES
  ('Paddling', 'Dragon boat paddling sessions', '🚣', 'blue'),
  ('Cardio', 'Running, cycling, swimming, etc.', '🏃', 'red'),
  ('Strength', 'Weight training, bodyweight exercises', '💪', 'purple'),
  ('Flexibility', 'Yoga, stretching, mobility work', '🧘', 'green'),
  ('Cross-Training', 'Other sports and activities', '⚡', 'orange'),
  ('Rest/Recovery', 'Active recovery, rest days', '😴', 'gray')
ON CONFLICT DO NOTHING;

-- Individual Workout Logs
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Workout details
  workout_type_id UUID REFERENCES workout_types(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  workout_date DATE NOT NULL,

  -- Duration and intensity
  duration_minutes INTEGER,
  intensity VARCHAR(50), -- 'low', 'moderate', 'high', 'max'

  -- Distance (for cardio)
  distance_km DECIMAL(10, 2),

  -- Metrics
  calories_burned INTEGER,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,

  -- Location/Method
  location VARCHAR(255), -- 'Gym', 'Outdoor', 'Home', etc.

  -- Visibility
  is_public BOOLEAN DEFAULT true, -- Visible to team members

  -- External tracking
  external_link VARCHAR(1000), -- Link to Strava, Garmin, etc.

  -- Notes
  notes TEXT,
  feeling VARCHAR(50), -- 'great', 'good', 'okay', 'tired', 'sore'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workout Programs (Admin-created training plans)
CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Program details
  program_type VARCHAR(100), -- 'strength', 'endurance', 'technique', 'general'
  difficulty VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  duration_weeks INTEGER,

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false, -- Mandatory for team members

  -- Content
  video_url VARCHAR(1000), -- YouTube, Vimeo, etc.
  image_url VARCHAR(1000),
  instructions TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workout Checklist Templates (Admin-created)
CREATE TABLE IF NOT EXISTS workout_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES workout_programs(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,
  sequence_order INTEGER DEFAULT 0,

  -- Checklist item details
  exercise_name VARCHAR(255),
  sets INTEGER,
  reps INTEGER,
  rest_seconds INTEGER,
  notes TEXT,

  video_url VARCHAR(1000), -- Demo video for this exercise

  created_at TIMESTAMP DEFAULT NOW()
);

-- Member Workout Program Enrollments
CREATE TABLE IF NOT EXISTS workout_program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES workout_programs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  enrolled_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0,

  UNIQUE(program_id, user_id)
);

-- Member Checklist Completion
CREATE TABLE IF NOT EXISTS workout_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES workout_checklists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES workout_program_enrollments(id) ON DELETE CASCADE,

  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  -- Optional tracking
  actual_sets INTEGER,
  actual_reps INTEGER,
  weight_used DECIMAL(10, 2),
  notes TEXT,

  workout_date DATE DEFAULT CURRENT_DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Challenges (Team-wide or individual challenges)
CREATE TABLE IF NOT EXISTS workout_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Challenge type
  challenge_type VARCHAR(100), -- 'distance', 'duration', 'frequency', 'streak', 'custom'

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Goal
  goal_value DECIMAL(10, 2), -- Target to achieve
  goal_unit VARCHAR(50), -- 'km', 'minutes', 'workouts', 'days'

  -- External
  external_link VARCHAR(1000), -- Strava challenge, etc.
  platform VARCHAR(100), -- 'strava', 'garmin', 'custom'

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Challenge Participants
CREATE TABLE IF NOT EXISTS workout_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES workout_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  joined_at TIMESTAMP DEFAULT NOW(),

  -- Progress
  current_value DECIMAL(10, 2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  -- Notes
  notes TEXT,

  UNIQUE(challenge_id, user_id)
);

-- Workout Resources (Admin-shared videos, articles, plans)
CREATE TABLE IF NOT EXISTS workout_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(100), -- 'video', 'article', 'plan', 'image'

  -- Content
  url VARCHAR(1000) NOT NULL,
  thumbnail_url VARCHAR(1000),

  -- Categorization
  category VARCHAR(100), -- 'technique', 'strength', 'nutrition', 'recovery', 'motivation'
  tags TEXT[], -- Array of tags

  -- Visibility
  is_pinned BOOLEAN DEFAULT false, -- Featured resources
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workout Streaks (Automatically calculated)
CREATE TABLE IF NOT EXISTS workout_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_workout_date DATE,
  total_workouts INTEGER DEFAULT 0,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workout_logs_user ON workout_logs(user_id);
CREATE INDEX idx_workout_logs_date ON workout_logs(workout_date DESC);
CREATE INDEX idx_workout_logs_public ON workout_logs(is_public);
CREATE INDEX idx_workout_programs_active ON workout_programs(is_active);
CREATE INDEX idx_workout_challenges_dates ON workout_challenges(start_date, end_date);
CREATE INDEX idx_workout_challenge_participants_user ON workout_challenge_participants(user_id);
CREATE INDEX idx_workout_resources_category ON workout_resources(category);

-- RLS Policies

-- Workout Logs: Users can manage their own, public logs visible to all
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public workout logs"
ON workout_logs FOR SELECT
USING (
  is_public = true
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

CREATE POLICY "Users can create their own workout logs"
ON workout_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs"
ON workout_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs"
ON workout_logs FOR DELETE
USING (auth.uid() = user_id);

-- Workout Programs: All can view, only admins/coaches can manage
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active workout programs"
ON workout_programs FOR SELECT
USING (is_active = true OR auth.uid() = created_by);

CREATE POLICY "Admins and coaches can manage workout programs"
ON workout_programs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Workout Checklists
ALTER TABLE workout_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view workout checklists"
ON workout_checklists FOR SELECT
USING (true);

CREATE POLICY "Admins and coaches can manage workout checklists"
ON workout_checklists FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Workout Program Enrollments
ALTER TABLE workout_program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all enrollments"
ON workout_program_enrollments FOR SELECT
USING (true);

CREATE POLICY "Users can enroll themselves"
ON workout_program_enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
ON workout_program_enrollments FOR UPDATE
USING (auth.uid() = user_id);

-- Checklist Completions
ALTER TABLE workout_checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all checklist completions"
ON workout_checklist_completions FOR SELECT
USING (true);

CREATE POLICY "Users can track their own completions"
ON workout_checklist_completions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Workout Challenges
ALTER TABLE workout_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
ON workout_challenges FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins and coaches can manage challenges"
ON workout_challenges FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Challenge Participants
ALTER TABLE workout_challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenge participants"
ON workout_challenge_participants FOR SELECT
USING (true);

CREATE POLICY "Users can join challenges"
ON workout_challenge_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON workout_challenge_participants FOR UPDATE
USING (auth.uid() = user_id);

-- Workout Resources
ALTER TABLE workout_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active resources"
ON workout_resources FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins and coaches can manage resources"
ON workout_resources FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Workout Streaks
ALTER TABLE workout_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all streaks"
ON workout_streaks FOR SELECT
USING (true);

CREATE POLICY "System can manage streaks"
ON workout_streaks FOR ALL
USING (true);

-- Workout Types
ALTER TABLE workout_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view workout types"
ON workout_types FOR SELECT
USING (true);

-- Function to update workout streaks
CREATE OR REPLACE FUNCTION update_workout_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update streak record
  INSERT INTO workout_streaks (user_id, current_streak, longest_streak, last_workout_date, total_workouts)
  VALUES (
    NEW.user_id,
    CASE
      WHEN (SELECT last_workout_date FROM workout_streaks WHERE user_id = NEW.user_id) = NEW.workout_date - INTERVAL '1 day'
      THEN COALESCE((SELECT current_streak FROM workout_streaks WHERE user_id = NEW.user_id), 0) + 1
      WHEN (SELECT last_workout_date FROM workout_streaks WHERE user_id = NEW.user_id) = NEW.workout_date
      THEN COALESCE((SELECT current_streak FROM workout_streaks WHERE user_id = NEW.user_id), 1)
      ELSE 1
    END,
    GREATEST(
      COALESCE((SELECT longest_streak FROM workout_streaks WHERE user_id = NEW.user_id), 1),
      CASE
        WHEN (SELECT last_workout_date FROM workout_streaks WHERE user_id = NEW.user_id) = NEW.workout_date - INTERVAL '1 day'
        THEN COALESCE((SELECT current_streak FROM workout_streaks WHERE user_id = NEW.user_id), 0) + 1
        ELSE 1
      END
    ),
    NEW.workout_date,
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = CASE
      WHEN workout_streaks.last_workout_date = NEW.workout_date - INTERVAL '1 day'
      THEN workout_streaks.current_streak + 1
      WHEN workout_streaks.last_workout_date = NEW.workout_date
      THEN workout_streaks.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      workout_streaks.longest_streak,
      CASE
        WHEN workout_streaks.last_workout_date = NEW.workout_date - INTERVAL '1 day'
        THEN workout_streaks.current_streak + 1
        WHEN workout_streaks.last_workout_date = NEW.workout_date
        THEN workout_streaks.current_streak
        ELSE 1
      END
    ),
    last_workout_date = NEW.workout_date,
    total_workouts = workout_streaks.total_workouts + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update streaks when workout is logged
CREATE TRIGGER workout_log_streak_update
AFTER INSERT ON workout_logs
FOR EACH ROW
EXECUTE FUNCTION update_workout_streak();

-- Comments
COMMENT ON TABLE workout_logs IS 'Individual workout tracking with visibility controls';
COMMENT ON TABLE workout_programs IS 'Admin-created training programs and plans';
COMMENT ON TABLE workout_checklists IS 'Structured workout checklists within programs';
COMMENT ON TABLE workout_challenges IS 'Team challenges and competitions';
COMMENT ON TABLE workout_resources IS 'Shared workout videos, articles, and resources';
COMMENT ON TABLE workout_streaks IS 'Automated workout streak tracking';
