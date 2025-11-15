# Dragon Boat Team Manager - Project Summary

## What We Built

A scalable web application for managing dragon boat teams with 100+ members, built using modern technologies with Supabase as the backend.

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool (faster than Create React App)
- **Tailwind CSS** - Styling framework
- **React Router v6** - Navigation
- **Zustand** - State management (simpler than Redux)
- **React Hot Toast** - Notifications

### Backend (Supabase)
- **PostgreSQL** - Database
- **Supabase Auth** - Authentication system
- **Row Level Security (RLS)** - Database-level security
- **Auto-generated REST API** - No backend code needed!
- **Realtime subscriptions** - Live data updates

### Hosting (Recommended)
- **Frontend**: Vercel (free tier)
- **Backend**: Supabase (free tier)
- **Total cost**: $0 for up to 500MB database + 50K monthly active users

## Project Structure

```
TeamOrganizationApp/
├── src/
│   ├── components/
│   │   └── Layout.jsx              # Main app layout with nav
│   ├── lib/
│   │   └── supabase.js             # Supabase client config
│   ├── pages/
│   │   ├── Login.jsx               # Auth page
│   │   ├── Dashboard.jsx           # Home page
│   │   ├── Practices.jsx           # Practice management
│   │   ├── Roster.jsx              # Team directory
│   │   ├── Lineups.jsx             # Boat lineup builder
│   │   ├── Announcements.jsx       # Team announcements
│   │   └── Profile.jsx             # User settings
│   ├── store/
│   │   └── authStore.js            # Auth state (Zustand)
│   ├── App.jsx                     # Main app + routing
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Global styles + Tailwind
├── .env                            # Environment variables (SECRET!)
├── .env.example                    # Template for .env
├── .gitignore                      # Files to exclude from Git
├── package.json                    # Dependencies
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind customization
├── postcss.config.js               # PostCSS config
├── .eslintrc.cjs                   # ESLint code quality
├── index.html                      # HTML entry point
│
├── DATABASE_SCHEMA.md              # Complete DB schema with SQL
├── SUPABASE_SETUP.md               # Step-by-step Supabase guide
├── README.md                       # Main documentation
├── QUICK_START.md                  # 15-min setup guide
├── DEVELOPMENT_ROADMAP.md          # Future features plan
└── PROJECT_SUMMARY.md              # This file
```

## Database Schema

### Core Tables (6 total)

1. **profiles** - User profiles extending Supabase auth
   - Basic info (name, email, phone, emergency contact)
   - Dragon boat specific (side preference, skill level, weight, height)
   - Role-based permissions (admin, coach, captain, member)

2. **practices** - Practice sessions
   - Schedule (date, time, location)
   - Type (water, land, gym, meeting)
   - Capacity and RSVP deadline
   - Status (scheduled, cancelled, completed)

3. **rsvps** - Attendance responses
   - Yes/No/Maybe status
   - Notes (e.g., "arriving late")
   - Links user to practice

4. **lineups** - Boat configurations
   - 22 positions (20 paddlers + steersperson + drummer)
   - JSONB structure for flexibility
   - Can be templates or practice-specific
   - Performance tracking (piece times)

5. **announcements** - Team communications
   - Priority levels (low → urgent)
   - Target specific roles
   - Email notification flag

6. **attendance_records** - Actual attendance
   - Tracks who actually showed up
   - Used for reliability scoring
   - Marked by coaches

### Security
- **Row Level Security (RLS)** enabled on all tables
- Policies ensure users can only modify their own data
- Admins/coaches have elevated permissions
- All queries run with user's permission level

## Features Implemented

### ✅ Phase 0 (Complete)
- User authentication (sign up, sign in, sign out)
- User profiles with dragon boat fields
- Role-based access control
- Navigation and routing
- Responsive layout
- Complete database schema
- Comprehensive documentation

### 🚧 Phase 1 (Next - 4-6 weeks)
- Practice scheduling and RSVP system
- Team roster directory
- Boat lineup builder with drag-and-drop
- Team announcements
- Attendance tracking

See `DEVELOPMENT_ROADMAP.md` for full feature list.

## Key Design Decisions

### Why Supabase?
1. **No backend code needed** - Database tables = automatic API
2. **Built-in auth** - Don't build login system from scratch
3. **Real-time** - Live updates without WebSockets code
4. **Free tier is generous** - Perfect for 100-500 users
5. **Easy to scale** - Upgrade plan when needed

### Why Zustand over Redux?
- 90% less boilerplate code
- Simpler to learn and use
- Perfect for small-to-medium apps
- Can migrate to Redux later if needed

### Why Tailwind CSS?
- No CSS files to manage
- Consistent design system
- Faster development
- Smaller bundle size (only used classes included)

### Why Vite over Create React App?
- 10-100x faster build times
- Hot module replacement (HMR) is instant
- Modern build tool (uses esbuild)
- Better developer experience

## Scalability

### Current Capacity (Free Tier)
- **Database**: 500MB (approx. 50,000+ records)
- **Users**: 50,000 monthly active users
- **Storage**: 1GB (for photos, PDFs, etc.)
- **Bandwidth**: 2GB per month

### When to Upgrade?
- **Pro Plan ($25/month)**:
  - 8GB database
  - 100K monthly active users
  - 100GB storage
  - 50GB bandwidth

For 100-200 team members, free tier is plenty!

### Performance Optimizations
- Database indexes on foreign keys and date columns
- Lazy loading of pages (code splitting)
- Optimized queries (select only needed columns)
- Caching via Supabase

## Security Features

1. **Authentication**
   - Email/password with verification
   - JWT tokens with auto-refresh
   - Session persistence
   - Optional 2FA (future)

2. **Database Security**
   - Row Level Security (RLS) on all tables
   - Users can't access data they shouldn't
   - SQL injection prevention (parameterized queries)
   - HTTPS-only connections

3. **API Security**
   - Anon key has limited permissions
   - Service role key never exposed to frontend
   - Rate limiting built into Supabase
   - CORS protection

## Environment Variables

Required `.env` variables:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**IMPORTANT**: Never commit `.env` to Git! It's in `.gitignore`.

## Deployment Process

### Development
```bash
npm run dev
```
Runs on http://localhost:3000

### Production Build
```bash
npm run build
```
Creates optimized `dist/` folder

### Deploy to Vercel
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy (automatic)

Result: `https://your-team.vercel.app`

## Testing Strategy (Future)

Recommended testing approach:
1. **Manual testing** - Current approach, good for MVP
2. **Unit tests** - For utility functions and calculations
3. **Component tests** - For React components
4. **E2E tests** - For critical user flows (sign up, create practice, RSVP)

Tools: Vitest + React Testing Library + Playwright

## Common Development Tasks

### Add a new page
1. Create file in `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`
3. Add nav link in `src/components/Layout.jsx`

### Add a new database table
1. Write SQL in Supabase SQL Editor
2. Add RLS policies
3. Create helper functions in a new store file
4. Use in components

### Add a new feature
1. Check `DEVELOPMENT_ROADMAP.md` for plan
2. Create feature branch
3. Develop and test
4. Update roadmap (check the box!)
5. Deploy

## Code Conventions

### File Naming
- Components: `PascalCase.jsx` (e.g., `LoginForm.jsx`)
- Utilities: `camelCase.js` (e.g., `formatDate.js`)
- Pages: `PascalCase.jsx` (e.g., `Dashboard.jsx`)

### Component Structure
```jsx
// Imports
import { useState } from 'react'

// Component
export default function MyComponent() {
  // State
  const [state, setState] = useState()

  // Effects
  useEffect(() => {}, [])

  // Handlers
  const handleClick = () => {}

  // Render
  return <div>...</div>
}
```

### Tailwind Classes
- Use utility classes: `className="bg-blue-500 text-white"`
- Extract common patterns to `index.css` using `@apply`
- Custom components use `.btn`, `.card`, `.input` classes

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| "Missing Supabase env vars" | Check `.env` file exists and has `VITE_` prefix |
| Can't sign in | Verify email first, check Supabase auth settings |
| Database error | Verify RLS policies are set up correctly |
| Build fails | Delete `node_modules`, run `npm install` |
| Styles not working | Restart dev server after Tailwind changes |
| API returns 403 | Check user permissions and RLS policies |

## Resources

### Official Docs
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com/docs)
- [React Router](https://reactrouter.com)

### Tutorials (Recommended)
- Supabase crash course: https://www.youtube.com/watch?v=7uKQBl9uZ00
- React + Vite tutorial: https://www.youtube.com/watch?v=bMknfKXIFA8
- Tailwind CSS tutorial: https://www.youtube.com/watch?v=pfaSUYaSgRo

## Next Steps

1. **Set up Supabase** - Follow `SUPABASE_SETUP.md`
2. **Run the app** - Follow `QUICK_START.md`
3. **Start developing** - Pick features from `DEVELOPMENT_ROADMAP.md`
4. **Deploy** - When ready, deploy to Vercel
5. **Invite team** - Share URL with your dragon boat team!

## Questions?

- Check `README.md` for general info
- Check `SUPABASE_SETUP.md` for setup issues
- Check `DEVELOPMENT_ROADMAP.md` for features
- Check `QUICK_START.md` for quick reference

## Credits

Built with ❤️ for dragon boat teams everywhere!

Technology choices based on industry best practices and optimal developer experience.

---

**Ready to paddle?** 🐉🚣

Start with `QUICK_START.md` and you'll be up and running in 15 minutes!
