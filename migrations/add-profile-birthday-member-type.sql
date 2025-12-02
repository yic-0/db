-- Add birthday and member_type fields to profiles for race eligibility validation
-- Birthday allows age calculation for age-restricted races
-- Member type tracks corporate affiliation for corporate-only events

-- Add birthday field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add member_type enum field
-- corporate: current corporate members (employees)
-- friends-family: friends & family of corporate members
-- ex-corporate: former corporate members/alumni
-- community: general community members (no corporate affiliation)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'community';

-- Add constraint for valid member types
ALTER TABLE profiles ADD CONSTRAINT valid_member_type
  CHECK (member_type IN ('corporate', 'friends-family', 'ex-corporate', 'community'));

-- Comments for documentation
COMMENT ON COLUMN profiles.birthday IS 'Member birthday for age calculation in race eligibility';
COMMENT ON COLUMN profiles.member_type IS 'Membership category: corporate, friends-family, ex-corporate, community';
