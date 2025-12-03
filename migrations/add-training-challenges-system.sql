-- Training Challenges System
-- Tiered challenges with team goals for dragon boat training

-- Add dragon boat benefit column to existing exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS dragon_boat_benefit TEXT;

-- Update some existing exercises with dragon boat benefits
UPDATE exercises SET dragon_boat_benefit = 'Builds the core stability essential for maintaining balance in the boat and transferring power from your legs through your torso to the paddle.' WHERE name = 'Plank Hold' AND dragon_boat_benefit IS NULL;
UPDATE exercises SET dragon_boat_benefit = 'Develops the rotational core strength that powers every paddle stroke. Stronger rotation = more power per stroke.' WHERE name = 'Russian Twists' AND dragon_boat_benefit IS NULL;
UPDATE exercises SET dragon_boat_benefit = 'Builds pulling power in your back and biceps - the same muscles used in the catch and pull phase of your stroke.' WHERE name = 'Resistance Band Rows' AND dragon_boat_benefit IS NULL;
UPDATE exercises SET dragon_boat_benefit = 'Strengthens your lats, the primary muscles responsible for pulling the paddle through the water.' WHERE name = 'Lat Pulldowns' AND dragon_boat_benefit IS NULL;
UPDATE exercises SET dragon_boat_benefit = 'Leg drive is the foundation of paddle power. Strong legs = explosive strokes off the start and sustained power throughout the race.' WHERE name = 'Squats' AND dragon_boat_benefit IS NULL;
UPDATE exercises SET dragon_boat_benefit = 'Practice your stroke mechanics on land to build muscle memory. Perfect technique before adding power.' WHERE name = 'Air Paddling' AND dragon_boat_benefit IS NULL;
UPDATE exercises SET dragon_boat_benefit = 'Builds the aerobic base you need to maintain power through 200m, 500m, and 2000m races.' WHERE name = 'Running' AND dragon_boat_benefit IS NULL;
UPDATE exercises SET dragon_boat_benefit = 'Full-body cardio that closely mimics the paddling motion. Excellent cross-training for paddlers.' WHERE name = 'Rowing Machine' AND dragon_boat_benefit IS NULL;

-- Training Challenges (tiered team challenges)
CREATE TABLE IF NOT EXISTS training_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  dragon_boat_relevance TEXT, -- Why this challenge helps paddling

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Tier requirements (exercises per week)
  starter_target INTEGER DEFAULT 2,
  starter_label TEXT DEFAULT 'Starter',
  committed_target INTEGER DEFAULT 4,
  committed_label TEXT DEFAULT 'Committed',
  intense_target INTEGER DEFAULT 6,
  intense_label TEXT DEFAULT 'Intense',

  -- Team goal (total exercises from all participants)
  team_goal INTEGER DEFAULT 200,

  -- Visual customization
  color TEXT DEFAULT '#0891b2',
  emoji TEXT DEFAULT '💪',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge Enrollments (user picks their tier)
CREATE TABLE IF NOT EXISTS challenge_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES training_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'committed', 'intense')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Weekly Exercise Assignments (coach assigns exercises for the week)
CREATE TABLE IF NOT EXISTS weekly_exercise_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  week_start DATE NOT NULL, -- Monday of the week
  notes TEXT,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_challenges_active ON training_challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_training_challenges_dates ON training_challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_challenge ON challenge_enrollments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_user ON challenge_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_exercise_assignments_week ON weekly_exercise_assignments(week_start);

-- RLS Policies
ALTER TABLE training_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_exercise_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Anyone can view active challenges" ON training_challenges;
DROP POLICY IF EXISTS "Admins can manage challenges" ON training_challenges;
DROP POLICY IF EXISTS "Anyone can view enrollments" ON challenge_enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON challenge_enrollments;
DROP POLICY IF EXISTS "Users can update own enrollment" ON challenge_enrollments;
DROP POLICY IF EXISTS "Anyone can view weekly assignments" ON weekly_exercise_assignments;
DROP POLICY IF EXISTS "Admins can manage weekly assignments" ON weekly_exercise_assignments;

-- Training Challenges: anyone can view active, admins manage
CREATE POLICY "Anyone can view active challenges"
  ON training_challenges FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach')
  ));

CREATE POLICY "Admins can manage challenges"
  ON training_challenges FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach')
  ));

-- Challenge Enrollments: anyone can view, users can enroll/update themselves
CREATE POLICY "Anyone can view enrollments"
  ON challenge_enrollments FOR SELECT
  USING (true);

CREATE POLICY "Users can enroll themselves"
  ON challenge_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment"
  ON challenge_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

-- Weekly Assignments: anyone can view, admins manage
CREATE POLICY "Anyone can view weekly assignments"
  ON weekly_exercise_assignments FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage weekly assignments"
  ON weekly_exercise_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach')
  ));

-- Comments
COMMENT ON TABLE training_challenges IS 'Tiered training challenges with team goals';
COMMENT ON TABLE challenge_enrollments IS 'User enrollment in challenges with selected tier';
COMMENT ON TABLE weekly_exercise_assignments IS 'Coach-assigned exercises for each week';
COMMENT ON COLUMN training_challenges.starter_target IS 'Weekly exercise target for Starter tier';
COMMENT ON COLUMN training_challenges.committed_target IS 'Weekly exercise target for Committed tier';
COMMENT ON COLUMN training_challenges.intense_target IS 'Weekly exercise target for Intense tier';
COMMENT ON COLUMN training_challenges.team_goal IS 'Total team exercise completions goal for the challenge';
