# Events & Race Day Management System

A comprehensive event management system for dragon boat races, regattas, hiking trips, and other team activities.

## Features Overview

### 🎯 Core Event Management
- **Event Creation**: Create and manage races, regattas, hiking trips, social events, training camps, and more
- **Event Types**: Race, Regatta, Hiking, Social, Training Camp, Other
- **Status Tracking**: Planning, Registration Open, Confirmed, In Progress, Completed, Cancelled
- **Rich Details**: Date, time, location, arrival time, captain's meeting details, capacity limits
- **Registration Deadlines**: Set cutoff dates for RSVPs

### 👥 Participant Management
- **RSVP System**:
  - Status levels: Interested 🤔, Registered ✋, Confirmed ✅, Declined ❌
  - Role assignment: Paddler, Steersperson, Drummer, Support, Spectator
  - Dietary restrictions tracking
  - Response notes
- **Participant List**: View all participants organized by status
- **Capacity Management**: Set max participants and track confirmed count

### 🚗 Carpool Coordination
- **Offer Carpools**: Members can offer rides with:
  - Vehicle description
  - Total seats and availability
  - Departure location and time
  - Return time estimate
  - Cost per person (gas money split)
  - Additional notes
- **Join/Leave Carpools**: Easy sign-up and management
- **Driver Management**: Drivers can manage their carpool details
- **Passenger Tracking**: See who's riding in each carpool

### 💰 Financial Tracking
- **Expense Management** (Admin/Coach):
  - Expense types: Registration Fee, Equipment Rental, Accommodation, Meals, Transportation, Other
  - Track amounts and due dates
  - Mark expenses as shared (split among participants)
  - Notes field for details
- **Payment Tracking**:
  - Individual payment records
  - Payment status: Pending, Paid, Refunded
  - Payment method and date tracking
- **Financial Summary**: Total expenses displayed

### 📋 Waiver & Document Management
- **Create Waivers**:
  - Waiver types: Liability, Photo Release, COVID, Other
  - Mark as required or optional
  - Link to external waiver documents
  - Store waiver text directly
- **Digital Signatures**:
  - Members can sign waivers digitally
  - Track who has signed
  - Signature timestamps
  - IP address logging

### 🏁 Race Schedule & Results
- **Race Creation**:
  - Race name and number
  - Distance (200m, 500m, 2000m, etc.)
  - Race type: Heat, Semi-Final, Final, Mixed, Open, Women's, etc.
  - Scheduled time
  - Link to lineup
- **Results Tracking**:
  - Finish position
  - Finish time
  - Race notes
  - Medal indicators (🥇🥈🥉)

### ✅ Task & Checklist Management
- **Task Creation**:
  - Task title and description
  - Categories: Logistics, Equipment, Registration, Coordination, Other
  - Priority levels: Low, Medium, High, Urgent
  - Assign to team members
  - Due dates with visual warnings
- **Task Completion**:
  - Check off completed tasks
  - Track who completed each task
  - Completion timestamps
  - Filter by status

## Database Schema

### Tables Created
1. **events** - Main event information
2. **event_rsvps** - Member registration and RSVPs
3. **event_carpools** - Carpool offerings
4. **event_carpool_passengers** - Carpool participants
5. **event_expenses** - Financial tracking
6. **event_payments** - Individual payment records
7. **event_waivers** - Required documents and waivers
8. **event_waiver_signatures** - Digital signature tracking
9. **event_races** - Race schedule and results
10. **event_tasks** - Preparation checklist

All tables include:
- Row Level Security (RLS) policies
- Proper foreign key relationships
- Indexes for performance
- Cascade deletion where appropriate

## User Roles & Permissions

### All Members
- ✅ View all events
- ✅ RSVP to events
- ✅ View participants
- ✅ Offer and join carpools
- ✅ View expenses
- ✅ View their own payments
- ✅ Sign waivers
- ✅ View race schedule
- ✅ View and complete assigned tasks

### Coaches
- ✅ Everything members can do, plus:
- ✅ Create and edit events
- ✅ Manage expenses
- ✅ Track payments for all members
- ✅ Create waivers
- ✅ Add and edit races
- ✅ Create and assign tasks

### Admins
- ✅ Everything coaches can do, plus:
- ✅ Delete events
- ✅ Delete carpools
- ✅ Delete tasks
- ✅ Full payment management

## File Structure

```
src/
├── pages/
│   ├── Events.jsx            # Event list page with filters
│   └── EventDetail.jsx       # Comprehensive event detail with tabs
├── store/
│   └── eventStore.js         # Zustand state management
migrations/
└── create-events-system.sql  # Complete database schema
```

## Getting Started

### 1. Run the Migration
1. Open Supabase SQL Editor
2. Copy and paste the contents of `migrations/create-events-system.sql`
3. Execute the migration
4. Verify all tables are created

### 2. Access the Events Page
- Navigate to the **Events** tab in the navigation bar (🏆 icon)
- All team members can view events
- Admins/Coaches will see a "Create Event" button

### 3. Create Your First Event
1. Click "+ Create Event"
2. Fill in event details:
   - Title (e.g., "Summer Dragon Boat Festival 2024")
   - Event Type
   - Date and times
   - Location
   - Capacity (optional)
3. Click "Create Event"

### 4. Manage Event Details
Click on any event to access the detail page with 7 tabs:

#### Overview Tab
- Edit event information
- View quick stats (interested, registered, confirmed, carpools)
- See event description and notes

#### Participants Tab
- View all RSVPs organized by status
- See participant roles and notes

#### Carpools Tab
- View all carpool offerings
- Offer a ride
- Join or leave carpools
- See available seats

#### Finances Tab
- Add expenses (admin/coach)
- View total costs
- Track due dates

#### Waivers Tab
- Create required waivers
- Members can sign digitally
- Track signature completion

#### Races Tab
- Add individual races to the schedule
- Track scheduled times
- Record results and positions
- Display medals for top 3 finishers

#### Tasks Tab
- Create preparation checklist
- Assign tasks to members
- Set priorities and due dates
- Check off completed items

## Common Use Cases

### Dragon Boat Race
1. Create event with type "Race" or "Regatta"
2. Set arrival time and captain's meeting time
3. Add required waivers (liability, photo release)
4. Create expense for registration fee
5. Members offer carpools
6. Add individual races to schedule
7. Create tasks: "Book hotel", "Pack equipment", "Print waivers"
8. Record results after each race

### Hiking Trip
1. Create event with type "Hiking"
2. Add location and meeting point
3. Members RSVP and indicate dietary restrictions
4. Create carpools for transportation
5. Add expenses: Park fees, Group dinner
6. Create tasks: "Book campsite", "Prepare route map", "Emergency contact list"

### Training Camp
1. Create event with type "Training Camp"
2. Set multi-day schedule
3. Track accommodation expenses
4. Create tasks for equipment and logistics
5. Add waivers if needed
6. Coordinate carpools

## Tips & Best Practices

### Event Planning
- ✅ Set registration deadlines to track commitments early
- ✅ Use the "Planning" status while organizing, switch to "Registration Open" when ready
- ✅ Add detailed notes about what to bring, dress code, parking info

### Carpools
- ✅ Encourage members to offer rides early
- ✅ Include departure location details (address or landmark)
- ✅ Specify cost per person for gas money transparency

### Finances
- ✅ Mark shared expenses to indicate split costs
- ✅ Set due dates for expenses requiring advance payment
- ✅ Track who paid initially for reimbursement purposes

### Tasks
- ✅ Break down preparation into specific, actionable items
- ✅ Use priority levels to highlight urgent tasks
- ✅ Assign tasks to specific people for accountability
- ✅ Set due dates relative to event date (e.g., 2 weeks before)

### Race Day
- ✅ Create races in chronological order
- ✅ Include race numbers from official schedule
- ✅ Link lineups to races for quick reference
- ✅ Record results immediately after each race

## Event Status Workflow

1. **Planning** - Initial creation, gathering details
2. **Registration Open** - Members can RSVP
3. **Confirmed** - Event is confirmed, final preparations
4. **In Progress** - Event is happening (optional)
5. **Completed** - Event finished, results recorded
6. **Cancelled** - Event won't happen

## RSVP Status Levels

- **Interested 🤔** - Might attend, not committed
- **Registered ✋** - Planning to attend
- **Confirmed ✅** - Definitely attending, counted in capacity
- **Declined ❌** - Cannot attend

## Integration with Existing Features

### Lineups
- Races can be linked to lineups
- View which lineup is assigned to each race
- Easy navigation from race schedule to lineup details

### Roster
- All active members can be assigned to tasks
- Carpool drivers and participants linked to profiles
- RSVP tracking tied to member profiles

### Profiles
- Member preferences (dietary restrictions) stored with RSVP
- Contact info available for carpool coordination

## Future Enhancements (Optional)

- [ ] Email notifications for event updates
- [ ] Automated reminders for task due dates
- [ ] Payment integration (Stripe, PayPal)
- [ ] Photo uploads for event gallery
- [ ] Export participant list to CSV/Excel
- [ ] Print-friendly race day schedule
- [ ] Weather integration for outdoor events
- [ ] Map integration for locations
- [ ] Mobile app support

## Troubleshooting

### Events not showing up
- Check that the migration was run successfully
- Verify RLS policies are in place
- Ensure you're logged in as a valid user

### Can't create events
- Verify your role is "admin" or "coach"
- Check browser console for errors

### Carpools not updating
- Refresh the page to see latest changes
- Check that seats are available
- Verify you're not already in the carpool

### Tasks not checking off
- Ensure you have permission to complete the task
- Refresh if the checkbox doesn't respond
- Check console for errors

## Support

For issues or feature requests:
1. Check the browser console for error messages
2. Verify database migration was successful
3. Ensure proper user roles are assigned
4. Check network tab for failed API calls

## Summary

The Events System provides comprehensive race day and event planning capabilities including:
- ✅ Event creation and management
- ✅ RSVP tracking with multiple status levels
- ✅ Carpool coordination
- ✅ Financial tracking
- ✅ Waiver management
- ✅ Race scheduling and results
- ✅ Task checklists

All features work seamlessly with existing roster, lineup, and profile systems!
