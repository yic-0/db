# Lineup Builder Enhancements - Implementation Plan

## Overview
Adding flexible lineup features to support on-deck paddlers, alternates, and variable boat sizes.

## Features to Implement

### 1. On-Deck/Alternate Positions per Seat
**Goal**: Allow multiple paddlers per position (primary + on-deck backup)

**Changes:**
- Each position becomes an array: `left[0] = [primaryPaddler, onDeckPaddler]`
- Drag-and-drop allows stacking 2 people in same slot
- Visual: Show primary larger, on-deck smaller/below
- Balance calculation: Show primary balance + (on-deck balance in parentheses)

### 2. Dedicated Alternates Section
**Goal**: 4 designated alternate slots at bottom of boat

**Changes:**
- New `alternates` array with 4 slots
- Each slot can hold multiple people (like positions)
- Displayed at bottom after steersperson
- Not included in primary balance calculations
- Can drag from alternates to positions

### 3. Variable Boat Size
**Goal**: Toggle number of rowing positions (6, 8, 10, 12 rows)

**Changes:**
- Add row selector: [6] [8] [**10**] [12]
- Default: 10 rows (20 paddlers)
- Options: 6 rows (12), 8 rows (16), 10 rows (20), 12 rows (24)
- Dynamically adjust `left` and `right` arrays
- Preserve data when switching (trim or extend with empty slots)

## Data Structure Changes

### Old Format (Current)
```javascript
{
  drummer: memberId | null,
  left: [memberId, memberId, ...] // 10 items
  right: [memberId, memberId, ...] // 10 items
  steersperson: memberId | null
}
```

### New Format (Proposed)
```javascript
{
  drummer: [memberId, onDeckId], // Array of 0-2 members
  left: [
    [memberId, onDeckId], // Position 1 - array of 0-2 members
    [memberId, onDeckId], // Position 2
    // ... up to boatRows positions
  ],
  right: [
    [memberId, onDeckId], // Position 1
    [memberId, onDeckId], // Position 2
    // ... up to boatRows positions
  ],
  steersperson: [memberId, onDeckId], // Array of 0-2 members
  alternates: [
    [memberId, ...], // Alternate slot 1 - array of 0-n members
    [memberId, ...], // Alternate slot 2
    [memberId, ...], // Alternate slot 3
    [memberId, ...], // Alternate slot 4
  ],
  boatRows: 10 // Number of rowing positions per side
}
```

## Balance Calculations

### Primary Balance (Main)
- Use first person in each position array
- Calculate as normal: total weight, L/R, F/B

### Secondary Balance (On-Deck - In Parentheses)
- Use second person in each position array (if exists)
- Calculate alternative balance
- Display: `Total: 1450kg (1420kg with on-deck)`

Example:
```
Left Side: 720kg (695kg)
Right Side: 730kg (725kg)
L/R Balance: -10kg (+30kg with on-deck)
```

## UI Changes

### Boat Size Selector
```
┌─────────────────────────────────────┐
│ Boat Size: [6] [8] [10*] [12] rows │
└─────────────────────────────────────┘
```

### Position Slot (with On-Deck)
```
┌──────────────────┐
│ PRIMARY          │
│ John Doe         │
│ 75kg | Advanced  │
│ ─────────────    │
│ ON-DECK          │
│ Jane Smith       │
│ 68kg | Inter.    │
└──────────────────┘
```

### Alternates Section
```
┌─────────────────────────────────────┐
│ ALTERNATES                          │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │Slot1│ │Slot2│ │Slot3│ │Slot4│   │
│ │Name │ │Name │ │Empty│ │Empty│   │
│ └─────┘ └─────┘ └─────┘ └─────┘   │
└─────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Data Structure (High Priority)
- [x] Update `boatPositions` state to use arrays
- [ ] Add `boatRows` state
- [ ] Add `alternates` array
- [ ] Update initialization logic
- [ ] Add migration logic for old lineups

### Phase 2: Drag & Drop Logic
- [ ] Update `handleDragEnd` to support array positions
- [ ] Allow dropping multiple people in same slot (max 2 for positions)
- [ ] Allow unlimited in alternates
- [ ] Update removal logic
- [ ] Test all drag scenarios

### Phase 3: Balance Calculations
- [ ] Calculate primary balance (first person in each slot)
- [ ] Calculate on-deck balance (second person in each slot)
- [ ] Display both balances
- [ ] Update balance component UI

### Phase 4: Boat Size Toggle
- [ ] Add row selector buttons
- [ ] Handle resizing arrays (trim/extend)
- [ ] Preserve data when switching sizes
- [ ] Update rendering based on `boatRows`

### Phase 5: UI Components
- [ ] Create position slot component (primary + on-deck)
- [ ] Create alternates section
- [ ] Update boat layout rendering
- [ ] Add visual indicators (primary vs on-deck)

### Phase 6: Save/Load
- [ ] Update `handleSaveLineup` to save new format
- [ ] Update `handleLoadLineup` to load new format
- [ ] Add backward compatibility for old lineups
- [ ] Test save/load cycle

### Phase 7: Viewer Component
- [ ] Update `LineupViewer` to display new format
- [ ] Show on-deck paddlers
- [ ] Show alternates
- [ ] Show both balance calculations

## Backward Compatibility

### Loading Old Lineups
```javascript
// Old format: drummer = "uuid-123"
// Convert to: drummer = ["uuid-123"]

// Old format: left = ["uuid-1", "uuid-2", null, ...]
// Convert to: left = [["uuid-1"], ["uuid-2"], [], ...]
```

### Saving
- Always save in new format
- Old format will be upgraded on first load

## Testing Checklist

- [ ] Create new lineup with on-deck paddlers
- [ ] Load old lineup (should convert)
- [ ] Change boat size (6/8/10/12 rows)
- [ ] Drag to alternates
- [ ] Drag from alternates to positions
- [ ] Multiple people in same position
- [ ] Balance calculations accurate
- [ ] Save and reload
- [ ] View in Practice Management page

## Future Enhancements (Not in Scope)

- Color coding for on-deck vs primary
- Swap primary/on-deck within same position
- Named alternates (Alt 1, Alt 2, etc.)
- Export lineup as printable PDF
- Suggest optimal on-deck based on weight balance

## Breaking Changes

**None** - Old lineups will be automatically converted on load.

## Estimated Effort

- Phase 1-2: 2-3 hours (core functionality)
- Phase 3-4: 1-2 hours (calculations + sizing)
- Phase 5-6: 2-3 hours (UI + save/load)
- Phase 7: 1 hour (viewer updates)
- Testing: 1 hour

**Total: ~7-11 hours of development**

## Decision Points

1. **Max people per position?**
   - Proposal: 2 (primary + on-deck)
   - Alternates: unlimited

2. **Boat size options?**
   - Proposal: 6, 8, 10, 12 rows
   - Other: 6, 8, 10 rows only?

3. **Show on-deck in balance by default?**
   - Proposal: Show primary, on-deck in parentheses
   - Alternative: Toggle view

4. **Drag behavior when position full?**
   - Proposal: Swap with existing (move to available)
   - Alternative: Block drop

## Notes

This is a significant refactor but maintains backward compatibility. Old lineups will continue to work and will be automatically upgraded when loaded and saved.
