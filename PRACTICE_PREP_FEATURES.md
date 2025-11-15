# Practice Management Page

## Overview
A single-page coach's control center for managing practice day activities. This page is designed to be used **ON practice day** for real-time management of attendance, notes, and lineup.

## Access
- **URL**: `/practice-prep`
- **Navigation**: "Manage Practice" tab (only visible to admins/coaches)
- **Permissions**: Admin and Coach roles only

## Key Features

### 1. Practice Selection
- Shows upcoming practices and recent practices (last 7 days)
- Displays RSVP counts and attendance stats
- One-click to open practice management view

### 2. Stats Dashboard
Real-time metrics displayed at the top:
- **Attended**: Number of members checked in
- **RSVP'd Yes**: Expected attendees
- **Maybe**: Uncertain attendees
- **Capacity**: Current attendance vs. max capacity

### 3. Overall Practice Notes
- Large text area for overall practice observations
- Auto-saves when you click outside the field
- Records weather, focus areas, achievements, issues, etc.

### 4. Attendance & Notes Tab
**Complete attendance tracking in one view:**

- **Quick Filters**: Jump to All, RSVP'd Yes, Attended, or No-Shows
- **Member Cards**: Each member shows:
  - Name and skill level
  - RSVP status badge (Yes, No, Maybe, No RSVP)
  - Attendance status (✓ Attended badge)
  - Walk-in badge (for those who didn't RSVP)
  - Check-in time
  - **Check In/Remove button** - Toggle attendance with one click
  - **Individual notes field** - Auto-saves member-specific observations

**Features:**
- ✅ Check in anyone (even without RSVP)
- ✅ Track walk-ins separately (no RSVP + attended)
- ✅ Individual notes for each member (technique, performance, etc.)
- ✅ All notes auto-save on blur
- ✅ Visual distinction between attended (green) and not attended (white)

### 5. Lineup Tab
- Link to full lineup builder
- Reminder that lineup builder filters by RSVP status
- Quick navigation to build today's lineup

## How Coaches Use This Page

### During Practice Day:

1. **Open "Manage Practice"** tab in navigation
2. **Select today's practice** from the list
3. **Check the stats** - see who RSVP'd and capacity
4. **Switch to Attendance & Notes tab**
5. **As members arrive:**
   - Click "Check In" button for each member
   - Walk-ins (no RSVP) get automatically flagged
   - Add quick notes about performance, technique, observations
6. **Write overall practice notes** at the top
7. **Optional: Click Lineup tab** to build/adjust lineup

### After Practice:

- Notes are already saved
- Review who attended vs. who RSVP'd
- Check no-shows (RSVP'd yes but didn't attend)
- Use data for follow-ups or future planning

## Design Philosophy

**Single Page Control Center:**
- No more clicking between multiple modals/pages
- Everything coaches need in one scrollable view
- Auto-save everywhere - no manual save buttons
- Real-time attendance tracking
- Built for mobile and tablet use at the dock

## Technical Details

### Data Flow
1. Fetches practices and members on mount
2. Loads RSVPs when practice is selected
3. Real-time updates when attendance is toggled
4. Auto-refresh after any attendance/note change

### Key Functions
- `handleToggleAttendance()` - Smart toggle for check-in/remove
- `handleSavePracticeNotes()` - Auto-saves overall notes
- `handleSaveMemberNotes()` - Auto-saves individual notes
- `getMembersWithStatus()` - Merges roster + RSVP data

### Walk-in Logic
- RSVP status stays `null` when checking in without RSVP
- Shows "Walk-in" badge for tracking
- Allows coaches to see who's reliable with RSVPs

## Future Enhancements
- [ ] Implement quick filter buttons (currently display-only)
- [ ] Historical notes - show previous 3 practices' notes for each member
- [ ] Embedded lineup builder in Lineup tab (instead of link)
- [ ] Export practice report as PDF
- [ ] Attendance analytics (show rates, trends)
- [ ] Quick templates for practice notes
- [ ] Offline mode for dock use without internet

## Comparison to Old "Manage Attendance" Modal

| Feature | Old Modal | New Page |
|---------|-----------|----------|
| Location | Button on each practice card | Dedicated nav tab |
| View | Small modal | Full page |
| Notes | Practice notes only | Practice + individual notes |
| Lineup | Separate page | Integrated tabs |
| Stats | Basic count | Full dashboard |
| Filters | Tab-based | Quick filters |
| Mobile | Cramped | Optimized |
| Use Case | Quick check-ins | Full practice management |

## Status
✅ **LIVE** - Available now at `/practice-prep` for admins and coaches
