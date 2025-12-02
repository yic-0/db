# Dragon Boat Team Manager - TODO & Notes

## Future Features & Enhancements

### Lineup Comparison & Visualization
- **Seat Leverage Heatmap Component** (`DragonBoatCogPanel.jsx`)
  - This component can be reused for popup/modal views when comparing lineups
  - Shows detailed seat-by-seat heatmap with leverage calculations
  - Can be used for side-by-side lineup comparisons
  - Location: `src/components/DragonBoatCogPanel.jsx`

- **Comparison Modes**
  - Current: Inline comparison with expandable panel
  - Future: Popup modal for detailed comparison
  - Future: Split-screen view for multiple lineup comparisons

### Notes
- The heatmap visualization logic is integrated into the drag-and-drop cards for quick visual feedback
- The standalone heatmap component (DragonBoatCogPanel) remains available for detailed comparison views
- Consider adding a "Compare" button on saved lineups to open side-by-side comparison modal

---

## Implementation Status

### ✅ Completed
- [x] Unified events system (practices, races, team events)
- [x] Calendar grid view with filters
- [x] Lineup builder with drag-and-drop
- [x] Port/starboard balance visualization
- [x] Center of gravity calculations
- [x] Seat leverage heatmap integration
- [x] RSVP tracking for practices and events
- [x] **Unified Practices page** - Integrated Practice Management into Practices page with tabs
  - Schedule tab: Member-facing RSVP interface (all users)
  - Attendance tab: Detailed attendance tracking with notes (coaches/admins)
  - Lineups tab: Practice lineup management (coaches/admins)
  - Removed redundant PracticePrep page and navigation link
- [x] **Fix practice end time validation** - Made end_time optional by converting empty strings to null
- [x] **Fix race/team event duplication bug** - Added filter to eventStore to exclude races (event_type='race'), preventing duplicates in Events page
- [x] **Restructure Events and Calendar pages** - Major architectural improvement:
  - Renamed Events page to Race page, focused exclusively on race/regatta management
  - Filtered Race page to show only race and regatta event types
  - Enhanced Calendar Quick Add with non-race event types (Practice, Workout, Race, Other)
  - Unified backend ensures all events share same logistics features (carpools, finances, tasks, waivers)
  - Events created in Calendar automatically appear in Race page when appropriate
  - Flexible navigation with navigate(-1) for EventDetail back button

### 🚧 In Progress
- [ ] Lineup comparison panel with side-by-side views
- [ ] Comparison badges showing deltas between primary/alternate lineups

### 🧪 Needs Testing
- [ ] **Race Requirements / Team Division Validation** (added 2024-12-02)
  - Run migrations: `add-profile-birthday-member-type.sql`, `add-team-requirements.sql`, `add-team-member-roles.sql`
  - Test Profile page: birthday field, member_type dropdown
  - Test Race Day tab: "Rules" button on team cards, division requirements editor
  - Test team member roles: paddler/drummer/steerer/alternate selector, exclude_from_count
  - Test validation: gender ratio (50:50), min/max paddlers, age limits, corporate-only
  - Test validation display: green/red badge on team header, issues list in expanded view

### ✅ Recently Completed
- [x] **Fix prospective races not showing in calendar** - Fixed status mismatch ('planning' vs 'prospective')
- [x] **Unify workouts and events system** - Implemented dual-purpose workout system:
  - Scheduled group workout events now saved as event_type='workout' in calendar
  - Self-tracked workout logging with social visibility via Team Activity tab
  - Workouts display with yellow color in calendar to distinguish from other events

### 📋 Planned

#### High Priority Fixes

#### Features & Enhancements
- [ ] **Make Lineup page more compact** - Need to see all elements quickly without excessive scrolling
  - Reduce spacing/padding between sections
  - Consider collapsible sections for less critical info
  - Optimize card sizes and layouts
  - Possibly make balance panels more condensed
- [ ] Popup/modal view for detailed lineup comparison
- [ ] **Inline Lineup Editing on Practice Page** - Alternative to current "Edit Lineup" link approach
  - Build drag-and-drop lineup editor directly in Practice Lineups tab
  - Avoid navigation away from Practice page
  - Would require duplicating lineup builder logic
- [ ] **Ability to import data**
  - Import roster data (CSV, Excel)
  - Import lineup configurations
  - Import practice/event schedules
- [ ] **Ability to export data**
  - Export lineup to PDF/image
  - Export roster to CSV/Excel
  - Export practice attendance reports
  - Export event schedules
  - Automatic contact info export
- [ ] **Waiver Management System**
  - Upload waiver documents (PDF/Photo)
  - Digital signature collection
  - Custom waiver forms with fillable fields
  - Member-facing waiver signing interface
  - Track waiver completion status per member
  - Waiver expiration and renewal reminders
- [ ] **Enhanced Announcements**
  - Quick email functionality to users
  - Email individual members or groups
  - Email templates for common announcements
  - Send to specific roles (all members, coaches only, etc.)
- [ ] **WhatsApp Integration**
  - Add WhatsApp contact links for members
  - Quick access to message members via WhatsApp
- [ ] **Content Request & Approval System**
  - Individual paddlers can submit content requests
  - Approval workflow for admin/coach review
  - Request tracking and status updates
  - Individual basis permissions and approvals
- [ ] Lineup templates and presets
- [ ] Historical lineup analytics
