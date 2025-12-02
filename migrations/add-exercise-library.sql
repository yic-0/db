-- Exercise Library for Training Hub
-- Pre-loaded exercises that coaches can assign and members can track

-- Exercise categories
CREATE TABLE IF NOT EXISTS exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💪',
  color TEXT DEFAULT '#0891b2',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise library (pre-loaded + custom)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES exercise_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  target_muscle_groups TEXT[], -- e.g., ['core', 'shoulders', 'back']
  difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  default_duration_minutes INTEGER,
  default_reps INTEGER,
  default_sets INTEGER,
  equipment_needed TEXT[], -- e.g., ['resistance band', 'paddle']
  video_url TEXT,
  image_url TEXT,
  is_dragon_boat_specific BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT true, -- true = pre-loaded, false = custom
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily/Weekly training plans that can be assigned
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT DEFAULT 'weekly' CHECK (plan_type IN ('daily', 'weekly', 'custom')),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within a training plan
CREATE TABLE IF NOT EXISTS training_plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. NULL for daily plans
  target_duration_minutes INTEGER,
  target_reps INTEGER,
  target_sets INTEGER,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User exercise completions (the checklist tracking)
CREATE TABLE IF NOT EXISTS exercise_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_duration_minutes INTEGER,
  actual_reps INTEGER,
  actual_sets INTEGER,
  notes TEXT,
  feeling TEXT CHECK (feeling IN ('great', 'good', 'okay', 'tired', 'struggling')),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id, completion_date) -- One completion per exercise per day
);

-- Practice drills library
CREATE TABLE IF NOT EXISTS practice_drill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🚣',
  color TEXT DEFAULT '#f59e0b',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES practice_drill_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  purpose TEXT, -- What this drill improves
  duration_minutes INTEGER,
  intensity TEXT DEFAULT 'moderate' CHECK (intensity IN ('low', 'moderate', 'high', 'race_pace')),
  boat_positions TEXT, -- Which positions benefit most
  video_url TEXT,
  coaching_points TEXT[], -- Key things to watch for
  is_system BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link drills to practices
CREATE TABLE IF NOT EXISTS practice_drill_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID REFERENCES practices(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES practice_drills(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id);
CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_user_date ON exercise_completions(user_id, completion_date);
CREATE INDEX IF NOT EXISTS idx_training_plan_exercises_plan ON training_plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_practice_drills_category ON practice_drills(category_id);

-- RLS Policies
ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_drill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_drill_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone can read exercise library
CREATE POLICY "Anyone can view exercise categories" ON exercise_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view exercises" ON exercises FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view training plans" ON training_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view training plan exercises" ON training_plan_exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can view drill categories" ON practice_drill_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view drills" ON practice_drills FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view drill assignments" ON practice_drill_assignments FOR SELECT USING (true);

-- Users can manage their own completions
CREATE POLICY "Users can view all completions" ON exercise_completions FOR SELECT USING (true);
CREATE POLICY "Users can insert own completions" ON exercise_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own completions" ON exercise_completions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON exercise_completions FOR DELETE USING (auth.uid() = user_id);

-- Admins/coaches can manage exercises and drills
CREATE POLICY "Admins can manage exercise categories" ON exercise_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);
CREATE POLICY "Admins can manage exercises" ON exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);
CREATE POLICY "Admins can manage training plans" ON training_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);
CREATE POLICY "Admins can manage plan exercises" ON training_plan_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);
CREATE POLICY "Admins can manage drill categories" ON practice_drill_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);
CREATE POLICY "Admins can manage drills" ON practice_drills FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);
CREATE POLICY "Admins can manage drill assignments" ON practice_drill_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);

-- =============================================
-- INSERT PRE-LOADED DATA
-- =============================================

-- Exercise Categories
INSERT INTO exercise_categories (name, description, icon, color, sort_order) VALUES
  ('Core & Stability', 'Build the foundation for powerful paddling', '🎯', '#ef4444', 1),
  ('Upper Body Strength', 'Develop arm, shoulder, and back power', '💪', '#f97316', 2),
  ('Lower Body & Legs', 'Leg drive and stability exercises', '🦵', '#eab308', 3),
  ('Dragon Boat Specific', 'Paddle technique and rotation drills', '🚣', '#22c55e', 4),
  ('Cardio & Endurance', 'Build stamina for race day', '❤️', '#ec4899', 5),
  ('Flexibility & Recovery', 'Stay limber and prevent injury', '🧘', '#8b5cf6', 6)
ON CONFLICT DO NOTHING;

-- Pre-loaded Exercises
INSERT INTO exercises (name, description, instructions, target_muscle_groups, difficulty, default_duration_minutes, default_reps, default_sets, equipment_needed, is_dragon_boat_specific, category_id) VALUES
-- Core & Stability
('Plank Hold', 'Foundation core exercise for paddling stability', 'Hold a straight-arm or forearm plank position. Keep your body in a straight line from head to heels. Engage your core throughout.', ARRAY['core', 'shoulders'], 'beginner', 1, NULL, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Core & Stability')),
('Russian Twists', 'Rotational core strength for paddle strokes', 'Sit with knees bent, lean back slightly. Rotate torso side to side, touching the ground beside your hips. Keep core engaged.', ARRAY['obliques', 'core'], 'intermediate', NULL, 20, 3, ARRAY['optional: medicine ball'], false, (SELECT id FROM exercise_categories WHERE name = 'Core & Stability')),
('Dead Bugs', 'Core stability with opposite limb movement', 'Lie on back, arms up, knees at 90°. Lower opposite arm and leg slowly while keeping lower back pressed to floor.', ARRAY['core', 'hip flexors'], 'beginner', NULL, 10, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Core & Stability')),
('Bicycle Crunches', 'Dynamic core and oblique work', 'Lie on back, hands behind head. Bring opposite elbow to knee in a cycling motion. Keep lower back pressed down.', ARRAY['obliques', 'core'], 'beginner', NULL, 20, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Core & Stability')),
('Mountain Climbers', 'Dynamic core with cardio element', 'Start in plank position. Drive knees alternately toward chest in a running motion. Keep hips low and core tight.', ARRAY['core', 'shoulders', 'hip flexors'], 'intermediate', 1, NULL, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Core & Stability')),
('Side Plank', 'Lateral core stability for balance in boat', 'Lie on side, prop up on forearm. Lift hips to create straight line. Hold and switch sides.', ARRAY['obliques', 'core'], 'intermediate', 1, NULL, 2, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Core & Stability')),

-- Upper Body Strength
('Push-Ups', 'Classic upper body strength builder', 'Start in plank position. Lower chest to ground, push back up. Keep core tight and body straight.', ARRAY['chest', 'shoulders', 'triceps'], 'beginner', NULL, 15, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Upper Body Strength')),
('Resistance Band Rows', 'Simulates paddle pull motion', 'Anchor band at chest height. Pull handles toward ribcage, squeezing shoulder blades together. Control the return.', ARRAY['back', 'biceps', 'shoulders'], 'beginner', NULL, 15, 3, ARRAY['resistance band'], true, (SELECT id FROM exercise_categories WHERE name = 'Upper Body Strength')),
('Lat Pulldowns', 'Build the lats crucial for paddle power', 'Grip bar wider than shoulders. Pull down to upper chest, squeezing lats. Control the release.', ARRAY['lats', 'biceps', 'back'], 'intermediate', NULL, 12, 3, ARRAY['cable machine or band'], false, (SELECT id FROM exercise_categories WHERE name = 'Upper Body Strength')),
('Shoulder Press', 'Overhead strength for paddle recovery', 'Press weights from shoulder height to overhead. Keep core tight, avoid arching back.', ARRAY['shoulders', 'triceps'], 'intermediate', NULL, 12, 3, ARRAY['dumbbells'], false, (SELECT id FROM exercise_categories WHERE name = 'Upper Body Strength')),
('Bent Over Rows', 'Strengthen the pulling muscles', 'Hinge at hips, back flat. Pull weight to ribcage, squeeze shoulder blades. Lower with control.', ARRAY['back', 'biceps', 'rear delts'], 'intermediate', NULL, 12, 3, ARRAY['dumbbells or barbell'], false, (SELECT id FROM exercise_categories WHERE name = 'Upper Body Strength')),
('Tricep Dips', 'Arm strength for paddle exit phase', 'Support yourself on parallel bars or bench edge. Lower body by bending elbows, push back up.', ARRAY['triceps', 'shoulders', 'chest'], 'intermediate', NULL, 12, 3, ARRAY['bench or dip bars'], false, (SELECT id FROM exercise_categories WHERE name = 'Upper Body Strength')),

-- Lower Body & Legs
('Squats', 'Foundation for leg drive power', 'Stand feet shoulder-width. Lower hips back and down like sitting in a chair. Keep chest up, knees tracking over toes.', ARRAY['quads', 'glutes', 'hamstrings'], 'beginner', NULL, 15, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Lower Body & Legs')),
('Lunges', 'Single leg strength and balance', 'Step forward into a lunge, both knees at 90°. Push back to start. Alternate legs.', ARRAY['quads', 'glutes', 'hamstrings'], 'beginner', NULL, 10, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Lower Body & Legs')),
('Glute Bridges', 'Hip drive power for paddling', 'Lie on back, knees bent. Drive hips up by squeezing glutes. Hold at top, lower with control.', ARRAY['glutes', 'hamstrings', 'core'], 'beginner', NULL, 15, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Lower Body & Legs')),
('Wall Sits', 'Isometric leg endurance', 'Back against wall, slide down to 90° knee angle. Hold position, keeping back flat against wall.', ARRAY['quads', 'glutes'], 'beginner', 1, NULL, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Lower Body & Legs')),
('Calf Raises', 'Ankle stability for boat balance', 'Stand on edge of step. Rise up on toes, lower heels below step level. Control the movement.', ARRAY['calves'], 'beginner', NULL, 20, 3, ARRAY['step or stairs'], false, (SELECT id FROM exercise_categories WHERE name = 'Lower Body & Legs')),

-- Dragon Boat Specific
('Air Paddling', 'Practice stroke technique without water', 'Mimic full paddle stroke motion: rotation, catch, pull, exit, recovery. Focus on proper form and timing.', ARRAY['core', 'shoulders', 'back'], 'beginner', 5, NULL, 2, ARRAY['paddle optional'], true, (SELECT id FROM exercise_categories WHERE name = 'Dragon Boat Specific')),
('Rotation Drills', 'Develop torso rotation for power', 'Sit on bench or floor. Hold paddle or stick across shoulders. Rotate fully side to side, leading with hips.', ARRAY['obliques', 'core'], 'beginner', 5, NULL, 2, ARRAY['paddle or stick'], true, (SELECT id FROM exercise_categories WHERE name = 'Dragon Boat Specific')),
('Catch Position Holds', 'Strengthen the catch position', 'Hold paddle at catch position (fully rotated, arms extended). Hold for 10-15 seconds, focusing on posture.', ARRAY['shoulders', 'core', 'back'], 'intermediate', NULL, 10, 3, ARRAY['paddle'], true, (SELECT id FROM exercise_categories WHERE name = 'Dragon Boat Specific')),
('Power Pull Simulation', 'Practice explosive pull phase', 'With resistance band anchored high, simulate the paddle pull motion explosively. Focus on leg drive and rotation.', ARRAY['back', 'core', 'legs'], 'intermediate', NULL, 15, 3, ARRAY['resistance band'], true, (SELECT id FROM exercise_categories WHERE name = 'Dragon Boat Specific')),
('Paddler Sit-Ups', 'Core with paddle motion integration', 'Lie on back holding paddle. Sit up while rotating paddle to one side, simulating stroke. Alternate sides.', ARRAY['core', 'obliques'], 'intermediate', NULL, 10, 3, ARRAY['paddle'], true, (SELECT id FROM exercise_categories WHERE name = 'Dragon Boat Specific')),

-- Cardio & Endurance
('Running', 'Build aerobic base for race endurance', 'Steady-state running at conversational pace. Focus on consistent breathing and relaxed form.', ARRAY['legs', 'cardiovascular'], 'beginner', 20, NULL, 1, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Cardio & Endurance')),
('Rowing Machine', 'Full body cardio that mimics paddling', 'Use proper rowing form: legs drive first, then lean back, then pull arms. Reverse on recovery.', ARRAY['full body', 'cardiovascular'], 'beginner', 15, NULL, 1, ARRAY['rowing machine'], true, (SELECT id FROM exercise_categories WHERE name = 'Cardio & Endurance')),
('Jump Rope', 'Cardio and coordination training', 'Skip rope at steady pace. Focus on light landings and consistent rhythm. Progress to intervals.', ARRAY['legs', 'cardiovascular', 'coordination'], 'beginner', 10, NULL, 1, ARRAY['jump rope'], false, (SELECT id FROM exercise_categories WHERE name = 'Cardio & Endurance')),
('Cycling', 'Low-impact cardio for endurance', 'Cycle at moderate intensity. Can be outdoor or stationary bike. Good for recovery days.', ARRAY['legs', 'cardiovascular'], 'beginner', 30, NULL, 1, ARRAY['bicycle'], false, (SELECT id FROM exercise_categories WHERE name = 'Cardio & Endurance')),
('Burpees', 'High-intensity full body cardio', 'From standing, drop to pushup, perform pushup, jump feet forward, explode up with jump. Repeat continuously.', ARRAY['full body', 'cardiovascular'], 'advanced', NULL, 10, 3, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Cardio & Endurance')),
('Swimming', 'Full body cardio with zero impact', 'Swim laps at steady pace. Great for recovery and building endurance without joint stress.', ARRAY['full body', 'cardiovascular'], 'intermediate', 20, NULL, 1, ARRAY['pool'], false, (SELECT id FROM exercise_categories WHERE name = 'Cardio & Endurance')),

-- Flexibility & Recovery
('Full Body Stretch Routine', 'Complete stretching sequence', 'Work through major muscle groups: neck, shoulders, back, hips, legs. Hold each stretch 30 seconds.', ARRAY['full body'], 'beginner', 15, NULL, 1, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Flexibility & Recovery')),
('Foam Rolling', 'Self-myofascial release for recovery', 'Roll slowly over tight muscles: IT band, quads, back, calves. Pause on tender spots for 30-60 seconds.', ARRAY['full body'], 'beginner', 10, NULL, 1, ARRAY['foam roller'], false, (SELECT id FROM exercise_categories WHERE name = 'Flexibility & Recovery')),
('Hip Flexor Stretch', 'Open up tight hip flexors from sitting', 'Kneel on one knee, other foot forward. Push hips forward gently. Hold 30 seconds each side.', ARRAY['hip flexors', 'quads'], 'beginner', 5, NULL, 1, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Flexibility & Recovery')),
('Shoulder Mobility', 'Keep shoulders healthy for paddling', 'Arm circles, shoulder rolls, cross-body stretches, doorway stretches. Move through full range of motion.', ARRAY['shoulders'], 'beginner', 5, NULL, 1, ARRAY[]::TEXT[], true, (SELECT id FROM exercise_categories WHERE name = 'Flexibility & Recovery')),
('Yoga Flow', 'Dynamic stretching and mindfulness', 'Flow through sun salutations or similar sequence. Focus on breath and movement coordination.', ARRAY['full body'], 'intermediate', 20, NULL, 1, ARRAY['yoga mat'], false, (SELECT id FROM exercise_categories WHERE name = 'Flexibility & Recovery')),
('Cat-Cow Stretches', 'Spinal mobility for rotation', 'On hands and knees, alternate arching back up (cat) and dropping belly down (cow). Move with breath.', ARRAY['spine', 'core'], 'beginner', 3, NULL, 1, ARRAY[]::TEXT[], false, (SELECT id FROM exercise_categories WHERE name = 'Flexibility & Recovery'))
ON CONFLICT DO NOTHING;

-- Practice Drill Categories
INSERT INTO practice_drill_categories (name, description, icon, color, sort_order) VALUES
  ('Warm-Up Drills', 'Get the team ready and synchronized', '🔥', '#ef4444', 1),
  ('Technique Focus', 'Refine stroke mechanics and form', '🎯', '#3b82f6', 2),
  ('Timing & Sync', 'Build team synchronization', '⏱️', '#22c55e', 3),
  ('Power Development', 'Build explosive strength', '💪', '#f97316', 4),
  ('Race Preparation', 'Simulate race conditions', '🏁', '#8b5cf6', 5),
  ('Cool-Down', 'Recovery and reflection', '🧊', '#06b6d4', 6)
ON CONFLICT DO NOTHING;

-- Pre-loaded Practice Drills
INSERT INTO practice_drills (name, description, instructions, purpose, duration_minutes, intensity, coaching_points, category_id) VALUES
-- Warm-Up Drills
('Easy Paddle Build', 'Gradual warm-up building from light to moderate', 'Start at 50% effort, gradually increase to 70% over the duration. Focus on getting everyone synced before adding power.', 'Warm up muscles and establish timing', 10, 'low', ARRAY['Watch for early fatigue', 'Ensure everyone is breathing', 'Check posture'], (SELECT id FROM practice_drill_categories WHERE name = 'Warm-Up Drills')),
('Arms Only', 'Paddle using only arms, no rotation', 'Keep body still, paddle using only arm movement. Short strokes, focus on blade entry and exit.', 'Isolate arm mechanics, feel the water', 5, 'low', ARRAY['No body movement', 'Clean blade entry', 'Quick exit'], (SELECT id FROM practice_drill_categories WHERE name = 'Warm-Up Drills')),

-- Technique Focus
('Catch Timing Drill', 'Focus on synchronized blade entry', 'All blades enter water at exact same moment. Caller counts "1-2-3-CATCH" with catch on the beat.', 'Perfect the catch timing across the boat', 10, 'moderate', ARRAY['Watch blade entry timing', 'Ensure full reach', 'No splashing'], (SELECT id FROM practice_drill_categories WHERE name = 'Technique Focus')),
('Exit Drill', 'Clean blade exit practice', 'Focus on slicing blade out of water cleanly at hip. No lifting water, no dragging.', 'Develop clean blade exit to maintain boat speed', 8, 'moderate', ARRAY['Exit at hip', 'Slice out, dont lift', 'Quick recovery'], (SELECT id FROM practice_drill_categories WHERE name = 'Technique Focus')),
('Rotation Focus', 'Emphasize torso rotation', 'Exaggerate the rotation - reach extra far forward, rotate extra far back. Feel the core engage.', 'Build rotation habit for more power', 10, 'moderate', ARRAY['Watch for shoulder-only paddling', 'Check hip rotation', 'Maintain balance'], (SELECT id FROM practice_drill_categories WHERE name = 'Technique Focus')),
('Top Arm Drive', 'Focus on top hand pushing through', 'Emphasize the top hand pushing forward and down. This is where power comes from.', 'Develop top arm engagement for power', 8, 'moderate', ARRAY['Top hand active', 'Push down and forward', 'Elbow stays high'], (SELECT id FROM practice_drill_categories WHERE name = 'Technique Focus')),

-- Timing & Sync
('Follow the Leader', 'Match timing to stroke in front', 'Everyone matches timing exactly to the paddler in front of them. Creates a wave effect.', 'Build awareness of team timing', 10, 'moderate', ARRAY['Eyes on paddler ahead', 'Mirror their timing', 'Adjust as needed'], (SELECT id FROM practice_drill_categories WHERE name = 'Timing & Sync')),
('Eyes Closed Paddling', 'Paddle with eyes closed briefly', 'Close eyes for 10 strokes, focus on feeling the timing through the boat. Listen to the rhythm.', 'Develop timing by feel not sight', 5, 'low', ARRAY['Safety first', 'Feel the boat movement', 'Listen to rhythm'], (SELECT id FROM practice_drill_categories WHERE name = 'Timing & Sync')),
('Rate Changes', 'Practice changing stroke rate smoothly', 'Caller changes rate every 20 strokes: slow (50), medium (65), fast (75). Smooth transitions.', 'Ability to change pace together', 12, 'moderate', ARRAY['Smooth transitions', 'Maintain timing through changes', 'Listen to caller'], (SELECT id FROM practice_drill_categories WHERE name = 'Timing & Sync')),

-- Power Development
('Power 10s', 'Ten maximum effort strokes', 'On command, give 10 strokes at 100% power while maintaining timing. Rest and repeat.', 'Build explosive power as a team', 15, 'high', ARRAY['All out effort', 'Maintain timing at high power', 'Quick recovery between sets'], (SELECT id FROM practice_drill_categories WHERE name = 'Power Development')),
('Power 20s', 'Twenty hard strokes', 'Build to max over 5 strokes, hold max for 10, bring down over 5. Focus on sustainable power.', 'Extend power capacity', 15, 'high', ARRAY['Build up smoothly', 'Sustainable max effort', 'Control the finish'], (SELECT id FROM practice_drill_categories WHERE name = 'Power Development')),
('Pyramid Sets', 'Increasing then decreasing intensity', '10 strokes easy, 10 medium, 10 hard, 10 max, then back down. No rest between.', 'Build endurance across intensities', 15, 'high', ARRAY['Clear intensity changes', 'Maintain form at all levels', 'Push through fatigue'], (SELECT id FROM practice_drill_categories WHERE name = 'Power Development')),
('Resistance Paddling', 'Paddle against drag or with pause', 'Paddle with a deliberate pause at the catch, or against anchor/drag. Builds strength.', 'Develop raw pulling power', 10, 'high', ARRAY['Feel the resistance', 'Drive with legs', 'Full extension'], (SELECT id FROM practice_drill_categories WHERE name = 'Power Development')),

-- Race Preparation
('Start Sequence', 'Practice race start protocol', 'Full race start: attention, set, GO with start strokes. Practice until automatic.', 'Perfect the race start', 15, 'race_pace', ARRAY['Quick first stroke', 'High rate start', 'Smooth transition to race pace'], (SELECT id FROM practice_drill_categories WHERE name = 'Race Preparation')),
('Race Pace Intervals', 'Intervals at target race pace', '250m at race pace, 1 min rest. Repeat 4-6 times. Hold target rate and power.', 'Build race pace endurance', 20, 'race_pace', ARRAY['Hit target rate', 'Consistent splits', 'Maintain form under fatigue'], (SELECT id FROM practice_drill_categories WHERE name = 'Race Preparation')),
('Mock Race', 'Full race simulation', 'Complete race simulation: warm up, start, race pace, finish sprint. Treat like race day.', 'Mental and physical race prep', 25, 'race_pace', ARRAY['Race day mindset', 'Execute race plan', 'Practice finishing strong'], (SELECT id FROM practice_drill_categories WHERE name = 'Race Preparation')),
('Finish Sprint Practice', 'Last 50m push', 'Practice the final sprint. On command, give everything for the last 20-30 strokes to the finish.', 'Develop strong race finish', 10, 'race_pace', ARRAY['Empty the tank', 'Maintain form', 'Dig deep together'], (SELECT id FROM practice_drill_categories WHERE name = 'Race Preparation')),

-- Cool-Down
('Easy Paddle Cool Down', 'Light paddling to recover', 'Very light pressure, focus on stretching through the stroke. Let heart rate come down.', 'Active recovery after hard work', 10, 'low', ARRAY['Very light pressure', 'Full range of motion', 'Breathe deeply'], (SELECT id FROM practice_drill_categories WHERE name = 'Cool-Down')),
('Stretching on Boat', 'In-boat stretching routine', 'Guided stretching while seated: shoulders, back, hips, legs. Hold each stretch 30 seconds.', 'Begin recovery while on water', 8, 'low', ARRAY['Balance while stretching', 'Hit all major muscles', 'Breathe into stretches'], (SELECT id FROM practice_drill_categories WHERE name = 'Cool-Down'))
ON CONFLICT DO NOTHING;

-- Create a default weekly training plan
INSERT INTO training_plans (name, description, plan_type) VALUES
('Dragon Boat Base Training', 'Balanced weekly training for paddlers', 'weekly')
ON CONFLICT DO NOTHING;
