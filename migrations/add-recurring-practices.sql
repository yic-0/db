-- Add Recurring Practices Support
-- Similar to Outlook recurring events pattern

-- Add recurrence fields to practices table
ALTER TABLE practices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20)
  CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly'));
ALTER TABLE practices ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[]; -- 0=Sun, 1=Mon, 2=Tue, etc.
ALTER TABLE practices ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS recurrence_count INTEGER; -- Alternative to end_date
ALTER TABLE practices ADD COLUMN IF NOT EXISTS parent_practice_id UUID REFERENCES practices(id) ON DELETE CASCADE;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS is_exception BOOLEAN DEFAULT false; -- Modified from series
ALTER TABLE practices ADD COLUMN IF NOT EXISTS original_date DATE; -- Original date before exception modification
ALTER TABLE practices ADD COLUMN IF NOT EXISTS coach_notes TEXT; -- Allow coach to add notes

-- Create index for faster parent lookups
CREATE INDEX IF NOT EXISTS idx_practices_parent ON practices(parent_practice_id);
CREATE INDEX IF NOT EXISTS idx_practices_recurring ON practices(is_recurring) WHERE is_recurring = true;

-- Add comments for documentation
COMMENT ON COLUMN practices.is_recurring IS 'True for the parent practice that defines a recurring series';
COMMENT ON COLUMN practices.recurrence_pattern IS 'Pattern: daily, weekly, biweekly, monthly';
COMMENT ON COLUMN practices.recurrence_days IS 'For weekly/biweekly: array of day numbers (0=Sun through 6=Sat)';
COMMENT ON COLUMN practices.recurrence_end_date IS 'Date when the recurring series ends';
COMMENT ON COLUMN practices.recurrence_count IS 'Number of occurrences (alternative to end_date)';
COMMENT ON COLUMN practices.parent_practice_id IS 'For generated instances, points to the parent recurring practice';
COMMENT ON COLUMN practices.is_exception IS 'True if this instance was modified independently from the series';
COMMENT ON COLUMN practices.original_date IS 'The original date this instance would have had before modification';

-- Example usage:
-- 1. Create recurring practice (parent):
--    INSERT INTO practices (title, date, start_time, ..., is_recurring, recurrence_pattern, recurrence_days, recurrence_end_date)
--    VALUES ('Weekly Water Practice', '2025-01-06', '18:00', ..., true, 'weekly', '{1,3}', '2025-06-30')
--    This creates a weekly practice on Mondays (1) and Wednesdays (3)
--
-- 2. Generate instances:
--    The application will generate individual practice instances with parent_practice_id set
--
-- 3. Edit single instance:
--    Update the specific practice and set is_exception = true
--
-- 4. Edit entire series:
--    Update the parent practice, then regenerate future instances
