-- Add workout assignments feature
-- Coaches/admins can assign specific workouts to members as daily tasks

-- Workout Assignments (Coach assigns workout to member)
CREATE TABLE IF NOT EXISTS workout_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Assignment details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  workout_type_id UUID REFERENCES workout_types(id),

  -- Target metrics (optional goals)
  target_duration_minutes INTEGER,
  target_distance_km DECIMAL(10, 2),
  target_sets INTEGER,
  target_reps INTEGER,

  -- Assignment date
  assigned_date DATE NOT NULL,
  due_date DATE,

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  -- Optional: Link to actual workout log when completed
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,
  coach_notes TEXT, -- Private notes for coach

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workout_assignments_assigned_to ON workout_assignments(assigned_to);
CREATE INDEX idx_workout_assignments_date ON workout_assignments(assigned_date);
CREATE INDEX idx_workout_assignments_completed ON workout_assignments(is_completed);

-- RLS Policies
ALTER TABLE workout_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
ON workout_assignments FOR SELECT
USING (
  auth.uid() = assigned_to
  OR auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Admins and coaches can create assignments
CREATE POLICY "Admins and coaches can create assignments"
ON workout_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Admins, coaches, and assigned users can update
CREATE POLICY "Assigned users and coaches can update assignments"
ON workout_assignments FOR UPDATE
USING (
  auth.uid() = assigned_to
  OR auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Only admins and coaches can delete
CREATE POLICY "Admins and coaches can delete assignments"
ON workout_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Comments
COMMENT ON TABLE workout_assignments IS 'Coach-assigned workouts that members check off as completed';
COMMENT ON COLUMN workout_assignments.coach_notes IS 'Private notes only visible to coaches and admins';
COMMENT ON COLUMN workout_assignments.workout_log_id IS 'Links to the actual workout log when member completes the assignment';
