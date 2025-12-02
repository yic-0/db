# Dragon Boat Team Manager

A modern web application for managing dragon boat teams, built with React and Supabase.

## Features (Phase 1 MVP)

- ✅ User authentication (sign up, sign in, sign out)
- ✅ User profiles with dragon boat specific fields
- ✅ Practice scheduling and RSVP system
- ✅ Team roster management
- ✅ Boat lineup builder
- ✅ Events & Race Management
- 🚧 Team announcements (coming soon)

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Authentication + Storage)
- **State Management**: Zustand
- **Routing**: React Router v6
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (free tier works great!)

### 1. Clone and Install

```bash
# Navigate to project directory
cd TeamOrganizationApp

# Install dependencies
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in:
   - **Name**: Dragon Boat Team Manager
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your team
4. Wait 2-3 minutes for project to be ready

### 3. Get Your Supabase Credentials

1. In your Supabase project dashboard, click the **Settings** icon (⚙️)
2. Click **API** in the sidebar
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 4. Configure Environment Variables

```bash
# Copy the example file
copy .env.example .env

# Edit .env and paste your Supabase credentials
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
```

### 5. Create Database Tables

1. In Supabase dashboard, click the **SQL Editor** icon
2. Click **New Query**
3. Open the file `DATABASE_SCHEMA.md` in this project
4. Copy the SQL from each table section and run them one by one
5. Important tables to create:
   - `profiles`
   - `practices`
   - `rsvps`
   - `lineups`
   - `announcements`
   - `attendance_records`

**Alternatively**, use the quick setup script:

1. Go to SQL Editor in Supabase
2. Paste the contents of `supabase/setup.sql` (see SUPABASE_SETUP.md)
3. Click "Run"

### 6. Set Up Row Level Security (RLS)

Security is crucial! Follow these steps:

1. In Supabase, go to **Authentication** → **Policies**
2. For each table, enable RLS
3. Add policies as documented in `DATABASE_SCHEMA.md`

**Quick method**: Run the RLS policies SQL from `supabase/policies.sql`

### 7. Start the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## First Time Setup

1. **Create your admin account**:
   - Click "Sign Up"
   - Enter your email and password
   - You'll receive a confirmation email
   - Click the link to verify

2. **Update your profile to admin**:
   - Go to Supabase → Table Editor → profiles
   - Find your profile row
   - Change `role` from `member` to `admin`

3. **Complete your profile**:
   - Click "Profile" in the app
   - Fill in your details
   - Save changes

## Project Structure

```
TeamOrganizationApp/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── Layout.jsx       # Main app layout with navigation
│   ├── lib/
│   │   └── supabase.js      # Supabase client configuration
│   ├── pages/               # Page components
│   │   ├── Login.jsx        # Authentication page
│   │   ├── Dashboard.jsx    # Home dashboard
│   │   ├── Practices.jsx    # Practice management
│   │   ├── Roster.jsx       # Team roster
│   │   ├── Lineups.jsx      # Boat lineup builder
│   │   ├── Announcements.jsx
│   │   └── Profile.jsx      # User profile settings
│   ├── store/
│   │   └── authStore.js     # Authentication state management
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles + Tailwind
├── DATABASE_SCHEMA.md       # Complete database schema
├── SUPABASE_SETUP.md        # Supabase setup guide
├── package.json
└── vite.config.js
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Deployment

### Deploy to Vercel (Recommended - Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"

Your app will be live in ~2 minutes!

### Deploy to Netlify (Alternative - Free)

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add environment variables (same as Vercel)
7. Click "Deploy"

## Next Steps

See `DEVELOPMENT_ROADMAP.md` for planned features and how to contribute.

### Phase 2 Features Coming Soon:

- Practice scheduling with calendar view
- RSVP system with attendance tracking
- Boat lineup builder with drag-and-drop
- Team announcements with email notifications
- Race/regatta management

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists
- Check that variable names start with `VITE_`
- Restart dev server after changing `.env`

### Can't sign in after creating account
- Check email for verification link
- Check Supabase → Authentication → Users to see if account exists
- Make sure RLS policies are set up correctly

### Database errors
- Verify all tables are created in Supabase
- Check that RLS is enabled on tables
- Review Supabase logs: Settings → Logs

## Support

For issues or questions:
1. Check the documentation in this folder
2. Review Supabase docs: https://supabase.com/docs
3. Open an issue in the project repository

## License

MIT - feel free to use this for your dragon boat team!
