# Guest Paddler System

## Overview
The guest paddler system allows coaches and admins to add temporary paddlers (guests, trial members, visitors) to the roster and lineups without requiring them to create accounts. When guests later sign up for accounts, they can claim their existing profiles to preserve their history.

## Features Implemented

### 1. Database Schema ✅
**Migration**: [migrations/add-is-guest-to-members.sql](migrations/add-is-guest-to-members.sql)

Added `is_guest` boolean column to the `profiles` table:
- Default: `false` (regular members)
- Indexed for efficient filtering
- Allows tracking guest vs regular members

### 2. Store Functions ✅
**File**: [src/store/rosterStore.js](src/store/rosterStore.js)

#### New Functions:

**`addGuestMember(guestData)`**
- Creates a guest profile with minimal required fields
- Required: `full_name`, `weight_kg`
- Optional: `skill_level`, `preferred_side`
- Generates temporary email: `guest_${timestamp}@temporary.local`
- Sets `is_guest: true` and `is_active: true`

**`claimGuestProfile(guestId, userId)`**
- Merges guest data into new user's profile
- Preserves: weight, skill level, preferred side
- Keeps: user's email, full_name, role
- Deletes guest profile after merge
- Returns updated user profile

**`convertGuestToMember(guestId)` (Admin Action)**
- Manually converts guest to regular member
- Simply sets `is_guest: false`
- Useful if admin wants to keep guest profile without merging

#### Updated Functions:

**`getFilteredMembers()`**
- Added guest filter support
- `filters.showGuests` toggles guest visibility

**`getStats()`**
- Added `guests` count to stats

### 3. Roster Page UI ✅
**File**: [src/pages/Roster.jsx](src/pages/Roster.jsx)

#### New Features:

**"+ Add Guest Paddler" Button**
- Available to coaches and admins
- Opens guest creation modal
- Prominent placement in header

**Guest Creation Modal**
- Clean, user-friendly form
- Required fields: Full Name, Weight (kg)
- Optional fields: Skill Level, Preferred Side
- Orange info box explaining guest paddler concept
- Validation before submission

**Guest Stats Card**
- Shows total number of guest paddlers
- Orange color scheme to match guest theme
- Displayed in admin stats dashboard

**"Show Guests" Filter**
- Toggle to show/hide guest paddlers
- Default: `true` (show guests)
- Helps clean up roster view when needed

**Guest Visual Indicators**
- Orange-highlighted table rows for guests
- "GUEST" badge next to member names
- Orange background (`bg-orange-50`) for distinction

### 4. Lineup Builder Integration ✅
**File**: [src/pages/Lineups.jsx](src/pages/Lineups.jsx)

**Guest Indicators on Member Cards:**
- Orange background for guest cards
- "GUEST" badge in card header
- Works seamlessly with drag-and-drop
- No functionality differences (weight calculations work normally)

### 5. Lineup Viewer Integration ✅
**File**: [src/components/LineupViewer.jsx](src/components/LineupViewer.jsx)

**Guest Indicators on Boat Positions:**
- "GUEST" badge for drummer position
- "G" badge for paddlers (compact view)
- "GUEST" badge for steersperson position
- Visible in all practice lineup views

### 6. Attendance Tracking Integration ✅
**File**: [src/components/AttendanceModal.jsx](src/components/AttendanceModal.jsx)
**Migration**: [migrations/update-rsvps-for-guests.sql](migrations/update-rsvps-for-guests.sql)

**Guest Attendance Features:**
- Guests appear in "All Members" tab of attendance modal
- Orange "GUEST" badge next to name
- Full check-in/check-out functionality
- Walk-in tracking (for guests who don't RSVP)
- Individual performance notes
- Attendance history preserved for profile claiming

**Database Changes:**
- Updated `rsvps` table foreign key to reference `profiles.id` instead of `auth.users.id`
- Allows guests (without auth accounts) to have attendance records
- Updated RLS policies to allow coaches/admins to manage guest attendance
- Removed NOT NULL constraint from `status` column to allow walk-in tracking (NULL status = no RSVP, just showed up)

## Profile Claiming Flow (To Be Implemented)

### User Experience:

1. **Guest Arrives at Practice**
   - Coach adds them as guest paddler: "John Doe, 75kg"
   - Guest appears in roster with GUEST badge
   - Can be added to lineups immediately
   - Attendance and notes tracked normally

2. **Guest Decides to Join**
   - Signs up via normal registration flow
   - Uses their actual email and name
   - Profile created as regular member

3. **Claiming Process** (Manual for now, can be automated later)
   - Admin identifies guest profile matches new signup
   - Uses admin panel to merge profiles
   - Historical data preserved (attendance, lineup history, notes)

### Technical Implementation Plan:

#### Option A: Admin-Initiated Claiming (Simpler)
1. Add "Claim Profile" button in member edit modal (admin only)
2. Search for guest profiles by name
3. Confirm merge with dialog
4. Call `claimGuestProfile(guestId, userId)`

#### Option B: User-Initiated Claiming (Better UX)
1. After signup, check if any guest profiles match user's name
2. Show banner: "We found a previous guest profile for [Name]. Claim it?"
3. User confirms or dismisses
4. Call `claimGuestProfile(guestId, userId)`

#### Option C: Automatic Claiming (Advanced)
1. During signup, fuzzy-match full_name with guest profiles
2. If confident match (>90% similarity), auto-merge
3. If uncertain (70-90%), prompt user to confirm
4. If no match, create new profile normally

## Usage Guide

### Adding a Guest Paddler

1. Navigate to **Roster** page
2. Click **"+ Add Guest Paddler"** (admin/coach only)
3. Fill in required fields:
   - **Full Name**: Guest's full name
   - **Weight (kg)**: Required for boat balance
4. Optional fields:
   - **Skill Level**: Novice/Intermediate/Advanced/Competitive
   - **Preferred Side**: Left/Right/No preference
5. Click **"Add Guest"**

### Managing Guests

**Show/Hide Guests:**
- Use the "Show Guests" filter in admin filters section
- Toggle to Yes/No to control visibility

**Identify Guests:**
- Orange row backgrounds in roster table
- "GUEST" badge next to names
- Orange background in lineup cards

**Using Guests in Lineups:**
- Guests work exactly like regular members
- Drag and drop to positions
- Weight automatically included in balance
- GUEST badge visible in all views

**Convert Guest to Member:**
- Currently: Admin manually changes `is_guest` to `false` in database
- Future: Admin panel button to convert

## Data Preservation

When a guest profile is claimed or converted:

### Preserved Data:
- ✅ Paddling data (weight, skill level, preferred side)
- ✅ Practice attendance history
- ✅ Coach notes from past practices
- ✅ Lineup participation history

### User Data:
- ✅ Email (from signup, not guest's temporary email)
- ✅ Full name (user can update if needed)
- ✅ Account credentials
- ✅ Role and permissions

## Benefits

### For Coaches:
- Add walk-in guests immediately
- Balance boats accurately with guest weights
- Track guest attendance and performance
- No need for guests to create accounts upfront

### For Guests:
- Try before committing to signup
- History preserved when they join
- Seamless transition from guest to member

### For Team Management:
- Accurate roster counts
- Clear distinction between members and guests
- Easy cleanup of one-time visitors
- Historical tracking for returning guests

## Security Considerations

- Guests have no login credentials (temporary email)
- Cannot access the app themselves
- Only coaches/admins can add guests
- Profile claiming requires admin verification (prevents unauthorized claims)

## Future Enhancements

- [ ] Automated profile claiming during signup
- [ ] Fuzzy name matching for guest profiles
- [ ] Guest conversion UI in admin panel
- [ ] Bulk guest cleanup tool (remove old guests)
- [ ] Guest expiration (auto-archive after X days)
- [ ] Guest invitation emails (convert to member)
- [ ] Track number of practices attended as guest
- [ ] Auto-suggest guests convert to members after N practices

## Database Queries

### Find All Guests:
```sql
SELECT * FROM profiles WHERE is_guest = true AND is_active = true;
```

### Find Guest by Name:
```sql
SELECT * FROM profiles
WHERE is_guest = true
AND full_name ILIKE '%John Doe%';
```

### Convert Guest to Member:
```sql
UPDATE profiles
SET is_guest = false
WHERE id = 'guest-uuid';
```

### Count Guests:
```sql
SELECT COUNT(*) FROM profiles WHERE is_guest = true;
```

## Status

✅ **READY TO USE** - Basic guest system fully functional after running SQL migration

⏳ **PENDING** - Profile claiming UI (manual merge via admin panel or automated during signup)

**Tracking Guest Attendance:**
- Guests appear in the "All Members" tab (not RSVP'd Members unless they actually RSVP)
- Check in guests like any other member
- Add performance notes during check-in
- Attendance history automatically preserved
- Walk-in tracking for guests who show up without RSVP

## Migration Checklist

Before using this feature:

1. ✅ Run `migrations/add-is-guest-to-members.sql` in Supabase SQL Editor
2. ✅ Run `migrations/update-profiles-rls-for-guests.sql` in Supabase SQL Editor
3. ✅ Run `migrations/update-rsvps-for-guests.sql` in Supabase SQL Editor
4. ✅ Verify `is_guest` column exists in profiles table
5. ✅ Test adding a guest paddler via Roster page
6. ✅ Verify guest appears in lineup builder
7. ✅ Test guest filter toggle
8. ✅ Verify guest badges appear throughout app (roster, lineups, attendance)
9. ✅ Test checking in a guest for practice attendance
10. ⏳ Implement profile claiming flow (optional, can do manually for now)
