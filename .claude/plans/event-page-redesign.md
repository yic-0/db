# Event/Race Page Redesign Plan

## Decisions Made

| Question | Decision |
|----------|----------|
| Packing list | Admin sets required items **per-event**. **HIDE until Phase 4.** |
| Race Day tab | Only visible for **race-type events** |
| Photos | Separate tab with few photos + link to external album (Google/Apple). Full gallery page later. |
| RSVP UI | Best aesthetic option (compact badge or buttons) |
| "View as Paddler" | Yes, add toggle for admin/coach |
| Carpool "Need Ride" visibility | Only drivers + admin/coach can see |
| Carpool tab visibility | Admin toggle per event (some events don't need carpool) |
| Registration form | **Customizable per-race** - admin designs required fields. Pre-populate from onboarding data. |
| Paddler first view | When/where, RSVP, registration. Day-before: red reminder bar + weather + packing |
| Admin first view | Attendance → Outstanding RSVP → Outstanding tasks |
| Weather | Make smaller/inline |
| Captain's meeting | **Admin/coach only** |
| Deadlines | Move to **Manage tab** |
| Attendance visibility | Admin toggle, default: **only visible 1 week before race** for members |
| Accommodation | Needs design - admin toggles visibility. Multi-hotel support. |

**Phasing Priority:** C (Tabs) → A (RSVP/Mobile) → B (Role views) → D (Packing list)

**Key Constraint:** Keep ALL backend functionality. This is primarily a frontend/UX redesign.

---

## Customizable Registration Form (Future Phase)

Admin/coach designs registration fields per race:

**Possible fields (admin picks which to include):**
- ID # (passport, driver's license, etc.)
- ID Type dropdown
- Address
- Digital signature
- Emergency contact (pre-populated from onboarding)
- T-shirt size
- Dietary restrictions (pre-populated)
- Custom text fields

**Behavior:**
- Pre-populate known data from user's onboarding profile
- Allow user to override for this specific event
- Mark required vs optional fields
- Save responses to `event_registrations` table

---

## Accommodation Feature (Future)

Needs separate design work:
- Hotel name + address (Google Maps link)
- Rooming assignments
- Room numbers
- Support for multiple hotels (spillover)
- Admin controls visibility
- Modular design for flexibility

---

## Current Structure (for reference)

**5 Tabs Currently:**
1. **Overview** - RSVP, Registration, Event Details, Weather, Photos, Deadlines, Packing List
2. **Team** - RSVP counts, member lists by status, Manage RSVPs (admin)
3. **Travel** - Carpool coordination, map, offer carpool form
4. **Race Day** - Teams, Race schedule/heats, Lineups
5. **Admin** - Tasks, Expenses, Waivers (coach/admin only)

---

## New Tab Structure

### Tab 1: "Event" (Default - Essential Info)

**Hero Section** (no scroll needed on mobile):
```
┌─────────────────────────────────────────┐
│ 🏁 Dragon Boat Festival 2024            │
│ Sat, Dec 7 • 8:00 AM          ☀️ 72°F   │
│ Flushing Meadows Park  →  [Directions]  │
│                                         │
│ ┌─────────┐ ┌──────────┐ ┌───────────┐  │
│ │Interested│ │  Going  ✓│ │ Can't Go  │  │
│ └─────────┘ └──────────┘ └───────────┘  │
└─────────────────────────────────────────┘
```

**Day-Before Alert** (conditional):
```
┌─────────────────────────────────────────┐
│ 🔴 RACE TOMORROW! Don't forget your ID, │
│    paddle, and check the packing list!  │
└─────────────────────────────────────────┘
```

**Content sections:**
- Registration form button (if race type)
- Event Details (description, arrival time, captain's meeting)
- Instructions (collapsible)
- Notes (collapsible)
- Deadlines (if any)
- Venue Map (compact)

**Admin quick stats** (at top for admin/coach):
- "18 going • 4 interested • 2 declined"

### Tab 2: "Attendance" (replaces Team)

**Summary bar:**
```
22 attending: 18 paddlers, 3 support, 1 spectator
```

**Compact member list:**
- Avatar/initials + Name + Role badge
- Carpool icon (🚗 driving | 🎫 has ride | — needs ride)
- Admin: tap to change RSVP

**Filters:** All | Going | Interested | Declined | Need Ride (admin only)

### Tab 3: "Carpools" (replaces Travel)

**Admin toggle:** Can hide this tab entirely for events that don't need carpool coordination.

Keep all current functionality when enabled:
- Your carpool status at top
- Available rides list
- "Needs ride" list (visible to drivers + admin only)
- Map toggle
- Offer carpool form
- WhatsApp link support
- All the carpool management features

### Tab 4: "Race Day" (only for race-type events)

- Teams/Boats section
- Race heats timeline
- Lineups (preview + link to full page)
- All current race management features

### Tab 5: "Photos" (new, minimal)

- Grid of 4-6 uploaded photos
- "View full album →" link to external album
- Upload button (admin/coach)
- *Note: Full gallery page deferred to later*

### Tab 6: "Manage" (Admin/Coach only)

- **"View as Paddler"** toggle at top
- Tasks checklist
- Expenses
- Waivers
- Edit event settings
- All current admin features

---

## Phase 1: Tab Reorganization

### Changes:
1. Rename tabs: Overview→Event, Team→Attendance, Travel→Carpools
2. Move Photos to own tab (minimal implementation)
3. Hide Race Day tab for non-race events
4. Consolidate admin features into Manage tab
5. Add "View as Paddler" toggle stub

### Files to modify:
- `src/pages/EventDetail.jsx` - Main restructure

### Preserve:
- All store functions (eventStore.js)
- All component logic
- All Supabase queries
- Carpool visibility rules
- RSVP functionality

---

## Phase 2: Compact RSVP + Mobile

### Changes:
1. Compact hero section with inline weather
2. Day-before reminder banner
3. Better mobile tab pills
4. Collapsible sections for optional content

---

## Phase 3: Role-Aware Views

### Changes:
1. "View as Paddler" toggle functionality
2. Hide admin-only elements when toggled
3. Separate admin quick stats section
4. "Needs ride" visibility rules in Attendance tab

---

## Phase 4: Customizable Packing List

### Changes:
1. Admin can set event-specific required items
2. Members can add personal items
3. Persist personal items in localStorage
4. Show reminder in day-before banner
