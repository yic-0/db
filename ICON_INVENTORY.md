# Icon Inventory - Dragon Boat Team Manager

Complete list of all icons used in the application, organized by category and current implementation.

## SVG Icons (from Icon.jsx component)

### Navigation Icons
| Icon Name | Usage | Files |
|-----------|-------|-------|
| `dashboard` | Dashboard page navigation | Layout.jsx |
| `calendar` | Calendar page navigation | Layout.jsx, Calendar.jsx, EventDetail.jsx, Dashboard.jsx |
| `practice` | Practice/training page navigation | Layout.jsx, Calendar.jsx, Dashboard.jsx |
| `roster` | Roster/team members page | Layout.jsx, Dashboard.jsx, Practices.jsx |
| `lineups` | Lineup builder page | Layout.jsx |
| `announcements` | Announcements page | Layout.jsx, Practices.jsx, PracticePrep.jsx |
| `profile` | User profile | Layout.jsx |
| `events` | Events/races page | Layout.jsx, Dashboard.jsx |
| `workouts` | Workouts page | Calendar.jsx, Dashboard.jsx, Workouts.jsx |
| `boat` | Dragon boat specific | Layout.jsx, Race.jsx, Dashboard.jsx |

### Action Icons
| Icon Name | Usage | Files |
|-----------|-------|-------|
| `plus` | Add new items | Calendar.jsx |
| `check` | Confirmation, RSVP yes | Workouts.jsx, Calendar.jsx, Practices.jsx, Dashboard.jsx |
| `close` | Cancel, dismiss, RSVP no | Calendar.jsx, Practices.jsx |
| `edit` | Edit action | Practices.jsx, Calendar.jsx |
| `delete` | Delete action | Icon.jsx |
| `manage` | Manage/edit | Race.jsx, Calendar.jsx |
| `more` | More options menu | Practices.jsx |
| `arrowRight` | Navigation arrow | Dashboard.jsx |

### Status & UI Icons
| Icon Name | Usage | Files |
|-----------|-------|-------|
| `chevronLeft` | Pagination/navigation | Icon.jsx |
| `chevronRight` | Pagination/navigation | Icon.jsx |
| `chevron-up` | Expand/collapse up | Practices.jsx, Icon.jsx |
| `chevron-down` | Expand/collapse down | Practices.jsx, Icon.jsx |
| `visibility` | Show/visible toggle | Practices.jsx |
| `visibility_off` | Hide/invisible toggle | Practices.jsx |
| `lock` | Locked/restricted | Practices.jsx |

### Functional Icons
| Icon Name | Usage | Files |
|-----------|-------|-------|
| `location` | Location/address | EventDetail.jsx, Calendar.jsx, Race.jsx |
| `clock` | Time/schedule | Workouts.jsx, Practices.jsx, Calendar.jsx, Dashboard.jsx |
| `settings` | Settings/configuration | Icon.jsx |
| `logout` | Logout action | Layout.jsx |
| `click` | Click/interactive | Icon.jsx |

### Achievement & Goal Icons
| Icon Name | Usage | Files |
|-----------|-------|-------|
| `fire` | Streak/consistency | Workouts.jsx, Dashboard.jsx |
| `trophy` | Achievements/races | Calendar.jsx, Dashboard.jsx |
| `target` | Goals/objectives | Workouts.jsx, Dashboard.jsx |

## Emoji Icons (Unicode Characters)

### Sport & Activity
| Emoji | Usage | Context | Files |
|-------|-------|---------|-------|
| ⚖️ | Balance/weight distribution | Boat balance visualization | DragonBoatLeftRightPanel.jsx, DragonBoatCogPanel.jsx |
| 🎯 | Center of gravity, coach role | COG panel, role indicator | DragonBoatCogPanel.jsx, Roster.jsx |
| 🥇 | First place finish | Race results | EventDetail.jsx |
| 🥈 | Second place finish | Race results | EventDetail.jsx |
| 🥉 | Third place finish | Race results | EventDetail.jsx |

### Time & Measurement
| Emoji | Usage | Context | Files |
|-------|-------|---------|-------|
| ⏰ | Time/schedule indicator | Event timing | EventDetail.jsx |
| 📏 | Distance measurement | Race distance | EventDetail.jsx |

### Editing & Actions
| Emoji | Usage | Context | Files |
|-------|-------|---------|-------|
| ✏️ | Edit action | Edit lineup/practice | PracticeLineupsManager.jsx, Lineups.jsx |

## Icon Usage by File

### High-Usage Files
- **Layout.jsx**: Navigation icons (dashboard, calendar, practice, roster, lineups, announcements, profile, events, workouts, boat, logout)
- **Practices.jsx**: Status icons (check, close, clock, visibility, edit, more, roster, chevron-up/down, lock)
- **Dashboard.jsx**: Quick action icons (boat, check, fire, trophy, calendar, roster, target, practice, workouts, events, arrowRight)
- **Calendar.jsx**: Event type icons (plus, calendar, close, check, practice, workouts, trophy, location, clock, manage)
- **EventDetail.jsx**: Race/event icons (calendar, location, medals 🥇🥈🥉, distance 📏, time ⏰)
- **Workouts.jsx**: Fitness icons (workouts, clock, target, check, fire)
- **Race.jsx**: Race management (boat, manage, close, location, calendar)

## Icon Categories Summary

### Total Count
- **SVG Icons**: 30 unique icons
- **Emoji Icons**: 8 unique emojis
- **Total**: 38 visual icons

### By Function
1. **Navigation** (10): Core app navigation
2. **Actions** (8): User interactions
3. **Status/UI** (7): Interface states
4. **Functional** (5): Specific features
5. **Achievement** (3): Goals and rewards
6. **Sport-specific** (5): Dragon boat related

## Recommended Replacement Strategy

### Priority 1: Core Navigation (High Impact)
Replace these first as they appear on every page:
- dashboard, calendar, practice, roster, lineups, announcements, profile, events, workouts, boat

### Priority 2: Common Actions (Medium Impact)
Frequently used across multiple pages:
- plus, check, close, edit, delete, manage, more

### Priority 3: Status Icons (Medium Impact)
UI state indicators:
- chevron-up/down, visibility/visibility_off, lock

### Priority 4: Specialized Icons (Lower Impact)
Feature-specific icons:
- location, clock, settings, logout, fire, trophy, target

### Priority 5: Emoji Replacement (Optional)
Consider replacing emojis with custom SVGs for consistency:
- ⚖️ → Balance icon
- 🎯 → Target/center icon
- 🥇🥈🥉 → Medal icons (1st/2nd/3rd)
- ⏰ → Clock icon
- 📏 → Ruler/distance icon
- ✏️ → Pencil/edit icon

## Notes for Custom Icon Design

### Style Guidelines
- Current icons use: 24x24 viewBox, 2px stroke width, round line caps/joins
- Minimalist, line-based design
- No fill colors (uses currentColor for stroke)
- Consistent weight across all icons

### Accessibility Considerations
- Icons should work in monochrome
- Include aria-labels where icons convey meaning
- Ensure sufficient contrast ratios
- Consider icon + text labels for clarity

### Design Consistency
- Maintain similar visual weight across icons
- Use consistent corner radii
- Align to pixel grid for crisp rendering
- Test at multiple sizes (14px, 16px, 18px, 20px, 24px, 28px)
