# Practice-Lineup Integration

## Overview
Practices can now have multiple lineups (boats) linked to them. This allows coaches to:
- Pre-plan lineups for specific practices
- Manage multiple boats per practice
- Track which lineup configurations were used on which practice days

## Database Changes

### New SQL Migration: `add-practice-lineup-link.sql`

Adds two new columns to the `lineups` table:

1. **`practice_id`** (UUID, nullable)
   - Foreign key to `practices(id)`
   - `ON DELETE SET NULL` - if practice is deleted, lineup remains but is unlinked
   - Allows lineups to exist independently or be linked to a practice

2. **`boat_name`** (VARCHAR(100))
   - Default: `'Boat 1'`
   - Identifier for the boat (e.g., "Boat 1", "Dragon Spirit", "Competition Boat")
   - Useful when managing multiple boats per practice

**Run this migration in Supabase SQL Editor before using the feature.**

## New Store Functions

### `useLineupStore` - New Functions

```javascript
// Fetch all lineups for a specific practice
fetchPracticeLineups(practiceId)
// Returns: { success: boolean, data: lineup[] }

// Link an existing lineup to a practice
linkLineupToPractice(lineupId, practiceId, boatName?)
// Returns: { success: boolean, data: lineup }

// Unlink a lineup from a practice
unlinkLineupFromPractice(lineupId)
// Returns: { success: boolean, data: lineup }
```

## New Components

### PracticeLineupsManager

**Location**: `src/components/PracticeLineupsManager.jsx`

### LineupViewer ⭐ NEW

**Location**: `src/components/LineupViewer.jsx`

A reusable component that displays a full boat lineup configuration inline.

**Features:**
- Collapsible display (toggle with ▶/▼ button)
- Visual boat layout from front to back (Drummer → Paddlers → Steersperson)
- Color-coded positions by role
- Weight and balance statistics
- Empty position indicators
- Responsive grid layout for left/right sides

**Props:**
- `lineup` (object): The lineup data with positions and balance info
- `isOpen` (boolean): Initial collapsed/expanded state (default: true)

### Features

1. **Display Practice Lineups**
   - Shows all lineups linked to the current practice
   - Displays boat name, lineup name, position summary
   - Lists creator and notes

2. **Embedded Lineup Viewer** ⭐ **NEW**
   - Full boat configuration displayed inline on the practice page
   - **Collapsible sections** (default: expanded)
   - Shows all 22 positions: drummer, steersperson, 20 paddlers
   - Displays member names, weights, skill levels for each position
   - **Color-coded by side**: Left (blue), Right (green), Drummer (purple), Steersperson (orange)
   - **Balance statistics**: Total weight, L/R balance, F/B balance
   - Visual warnings for imbalanced boats
   - Empty positions clearly marked
   - **No navigation required** - view everything on the practice page!

3. **Link Existing Lineup**
   - Modal to select from available lineups
   - Option to set custom boat name
   - Auto-increments boat numbers (Boat 1, Boat 2, etc.)

4. **Create New Lineup**
   - Quick button to navigate to lineup builder
   - Returns to practice page after creation

5. **Edit Lineup**
   - "✏️ Edit" button opens lineup in the full lineup builder
   - Maintains link to practice after editing
   - For making position changes, weight adjustments, etc.

6. **Unlink Lineup**
   - Removes practice association
   - Lineup remains in system for future use

## Usage in Practice Management Page

### Lineup Tab

The "Lineup" tab now displays:

- **Header Stats**: Number of boats configured
- **Action Buttons**:
  - "+ Link Existing Lineup" - opens modal to select lineup
  - "+ Create New Lineup" - navigate to lineup builder

- **Lineup Cards**: For each linked lineup shows:
  - Boat name badge
  - Lineup name
  - Position fill status (e.g., "22/22 positions filled")
  - Weight balance metrics
  - Notes
  - Creator info
  - "View/Edit" and "Unlink" buttons

### Empty State

When no lineups are linked:
- Clear message explaining the feature
- Quick access to both linking and creation options

## Workflow Examples

### Single Boat Practice

1. Coach goes to "Manage Practice"
2. Selects today's practice
3. Clicks "Lineup" tab
4. Either:
   - Links an existing lineup (e.g., "Standard Race Lineup")
   - Creates a new lineup specifically for this practice

### Multiple Boats Practice

1. Coach links first lineup, sets boat name "Dragon Spirit"
2. Clicks "+ Link Existing Lineup" again
3. Selects second lineup, sets boat name "Phoenix Rising"
4. Now practice shows 2 boats with different lineups

### Reusing Lineups

1. Coach creates "Tuesday Training Lineup" for Practice #1
2. For Practice #2 (also Tuesday), coach links the same lineup
3. Both practices now share this lineup configuration
4. Changes to lineup affect both practices

### Independent Lineups

1. Coach leaves `boat_name` empty - defaults to "Boat 1", "Boat 2"
2. Useful for generic practice boats without specific names

## Data Model

### Lineups Table Structure

```javascript
{
  id: UUID,
  name: string,                    // "Race Day Lineup"
  notes: string?,                  // Optional notes
  positions: {                     // JSON structure
    drummer: member_id,
    steersperson: member_id,
    paddlers: {
      left: [member_ids],          // 10 positions
      right: [member_ids]          // 10 positions
    },
    balance: {                     // Weight calculations
      totalWeight: number,
      leftTotal: number,
      rightTotal: number,
      frontTotal: number,
      backTotal: number,
      sideBalance: number,
      frontBackBalance: number
    }
  },
  practice_id: UUID?,              // NEW - optional link to practice
  boat_name: string,               // NEW - boat identifier
  created_by: UUID,
  created_at: timestamp
}
```

## Benefits

### For Coaches

1. **Better Planning**
   - Pre-plan lineups for specific practices
   - See which lineups were used historically
   - Reuse successful configurations

2. **Multiple Boats**
   - Manage practices with 2-3 boats
   - Each boat has its own lineup
   - Track boat names for clarity

3. **Flexibility**
   - Lineups can exist independently (for general use)
   - Or be linked to specific practices (for planning)
   - Easy to link/unlink as needed

### For Team Management

1. **Historical Tracking**
   - Know which lineup was used on which day
   - Analyze what configurations work best
   - Reference past successful lineups

2. **Consistency**
   - Reuse proven lineups across practices
   - Maintain boat-specific configurations
   - Reduce setup time

## Technical Notes

### Relationship Type

- **One-to-Many**: One practice can have many lineups
- **Many-to-One**: One lineup can be linked to one practice at a time
- **Nullable**: Lineups can exist without a practice link

### Cascade Behavior

- If practice is deleted: lineup's `practice_id` is set to NULL
- Lineup remains in system for future use
- No data loss on practice deletion

### Filtering

The "Link Existing Lineup" modal filters out:
- Lineups already linked to OTHER practices
- Shows lineups linked to current practice (for unlinking)
- Shows all unlinked lineups

## Future Enhancements

- [ ] Duplicate lineup for practice (create a practice-specific copy)
- [ ] Lineup templates based on practice type (training vs. race)
- [ ] Auto-suggest lineups based on who RSVP'd
- [ ] Quick lineup adjustments (swap paddlers) without opening full builder
- [ ] Export practice report with lineup configurations
- [ ] Lineup history view (which lineups were used when)
- [ ] Compare lineups side-by-side for multiple boats

## Migration Checklist

Before using this feature:

1. ✅ Run `add-practice-lineup-link.sql` in Supabase
2. ✅ Verify columns added: `practice_id`, `boat_name`
3. ✅ Check indexes created successfully
4. ✅ Test linking a lineup to a practice
5. ✅ Test creating a new lineup from practice page
6. ✅ Test unlinking a lineup
7. ✅ Verify practice deletion doesn't delete lineups

## Status

🚀 **READY TO USE** after running the SQL migration!
