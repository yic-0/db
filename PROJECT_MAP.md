# Project Map - Visual Guide

## 🗺️ Complete Project Structure

```
TeamOrganizationApp/
│
├── 📄 START_HERE.md                 ⭐ Read this first!
├── 📄 INDEX.md                       📚 Complete doc index
├── 📄 GETTING_STARTED.md             🎓 Beginner guide
├── 📄 QUICK_START.md                 ⚡ 15-min setup
├── 📄 README.md                      📖 Main documentation
├── 📄 SUPABASE_SETUP.md              🗄️ Database guide
├── 📄 DATABASE_SCHEMA.md             📊 Database reference
├── 📄 PROJECT_SUMMARY.md             🔧 Technical overview
├── 📄 DEVELOPMENT_ROADMAP.md         🗓️ Feature planning
├── 📄 PROJECT_MAP.md                 🗺️ This file!
│
├── 📄 package.json                   📦 Dependencies
├── 📄 vite.config.js                 ⚙️ Build config
├── 📄 tailwind.config.js             🎨 Styling config
├── 📄 postcss.config.js              🎨 CSS processing
├── 📄 .eslintrc.cjs                  ✅ Code quality rules
├── 📄 .gitignore                     🚫 Files to ignore
├── 📄 .env.example                   🔐 Env template
├── 📄 .env                           🔐 Your secrets (create this!)
├── 📄 index.html                     🌐 HTML entry point
│
└── 📁 src/                           💻 SOURCE CODE
    │
    ├── 📄 main.jsx                   🚪 App entry point
    ├── 📄 App.jsx                    🏠 Main app + routing
    ├── 📄 index.css                  🎨 Global styles
    │
    ├── 📁 components/                🧩 Reusable UI pieces
    │   └── 📄 Layout.jsx             📐 App layout + nav
    │
    ├── 📁 lib/                       🛠️ Utilities
    │   └── 📄 supabase.js            🔌 Database client
    │
    ├── 📁 store/                     💾 State management
    │   └── 📄 authStore.js           🔐 Auth state (Zustand)
    │
    └── 📁 pages/                     📄 Main pages
        ├── 📄 Login.jsx              🔑 Sign in/up page
        ├── 📄 Dashboard.jsx          🏠 Home page
        ├── 📄 Practices.jsx          🚣 Practice management
        ├── 📄 Roster.jsx             👥 Team directory
        ├── 📄 Lineups.jsx            📋 Boat lineups
        ├── 📄 Announcements.jsx      📢 Team messages
        └── 📄 Profile.jsx            👤 User settings
```

---

## 🎯 File Purposes

### 📚 Documentation Files (Read These!)

#### Must Read
- **START_HERE.md** - Your entry point, start here!
- **QUICK_START.md** - Get running in 15 minutes
- **README.md** - Everything you need to know

#### Setup & Config
- **SUPABASE_SETUP.md** - How to set up database
- **DATABASE_SCHEMA.md** - What's in the database
- **GETTING_STARTED.md** - Step-by-step orientation

#### Reference
- **INDEX.md** - Find any topic quickly
- **PROJECT_SUMMARY.md** - Technical deep dive
- **DEVELOPMENT_ROADMAP.md** - What to build next
- **PROJECT_MAP.md** - You're reading it!

---

### ⚙️ Configuration Files (Don't Delete!)

#### Package Management
- **package.json** - Lists all dependencies (React, Vite, etc.)
  - Run `npm install` to download everything
  - Run `npm run dev` to start app

#### Build Tools
- **vite.config.js** - Vite settings (port 3000, auto-open browser)
- **postcss.config.js** - CSS processing for Tailwind
- **tailwind.config.js** - Tailwind theme customization

#### Code Quality
- **.eslintrc.cjs** - Code linting rules
- **.gitignore** - Files Git should ignore

#### Secrets
- **.env.example** - Template for environment variables
- **.env** - **YOUR SECRETS** (create from .env.example)
  - ⚠️ NEVER commit this file!
  - Contains Supabase URL and API key

#### Entry Point
- **index.html** - HTML wrapper for React app

---

### 💻 Source Code (The Good Stuff!)

#### Entry Points
```
main.jsx (starts here)
   ↓
App.jsx (sets up routing)
   ↓
Layout.jsx (adds navigation)
   ↓
Pages (Dashboard, Practices, etc.)
```

#### Code Organization

**📁 components/** - Reusable UI components
- `Layout.jsx` - Header, nav, footer wrapper
- More components coming as we build features!

**📁 lib/** - Utilities and helpers
- `supabase.js` - Database connection client

**📁 store/** - Global state (using Zustand)
- `authStore.js` - User login/logout state
- More stores coming (practicesStore, rosterStore, etc.)

**📁 pages/** - Main application pages
- `Login.jsx` - Authentication (sign in/up)
- `Dashboard.jsx` - Home page with stats
- `Practices.jsx` - Practice scheduling (to build)
- `Roster.jsx` - Team member directory (to build)
- `Lineups.jsx` - Boat lineup builder (to build)
- `Announcements.jsx` - Team communications (to build)
- `Profile.jsx` - User settings and preferences

---

## 🔄 How Data Flows

### User Authentication Flow
```
1. User opens app
   ↓
2. main.jsx loads
   ↓
3. authStore.js checks for existing session
   ↓
4. If logged in → Dashboard
   If not → Login page
   ↓
5. User signs in
   ↓
6. Supabase validates credentials
   ↓
7. authStore saves user data
   ↓
8. App redirects to Dashboard
```

### Database Query Flow
```
1. Component needs data (e.g., practices list)
   ↓
2. Component calls Supabase
   ↓
3. supabase.js sends request
   ↓
4. Supabase checks RLS policies
   ↓
5. If allowed, returns data
   ↓
6. Component displays data
```

---

## 🧩 Component Hierarchy

```
App (routes)
│
├── Login (public route)
│
└── Layout (protected routes)
    ├── Header (team name, user menu)
    ├── Navigation (tabs)
    └── Outlet (current page)
        ├── Dashboard
        ├── Practices
        ├── Roster
        ├── Lineups
        ├── Announcements
        └── Profile
```

---

## 🗄️ Database Tables

```
Supabase Database
│
├── auth.users (built-in)
│   └── Supabase manages this
│
└── public schema (your tables)
    │
    ├── profiles (extends auth.users)
    │   ├── User info
    │   ├── Dragon boat preferences
    │   └── Role (admin/coach/member)
    │
    ├── practices
    │   ├── Schedule info
    │   ├── Location
    │   └── Capacity
    │
    ├── rsvps
    │   ├── Links user → practice
    │   └── Yes/No/Maybe status
    │
    ├── lineups
    │   ├── Boat configuration
    │   └── 22 positions (JSONB)
    │
    ├── announcements
    │   ├── Team messages
    │   └── Priority levels
    │
    └── attendance_records
        ├── Who actually showed up
        └── Reliability tracking
```

---

## 🛣️ URL Routes

```
http://localhost:3000/
│
├── /login              → Login.jsx (public)
│
└── / (protected)       → Layout.jsx wrapper
    ├── /               → Dashboard.jsx
    ├── /practices      → Practices.jsx
    ├── /roster         → Roster.jsx
    ├── /lineups        → Lineups.jsx
    ├── /announcements  → Announcements.jsx
    └── /profile        → Profile.jsx
```

---

## 📦 Dependencies (What's Installed)

### Frontend Framework
- **react** - UI library
- **react-dom** - React for web
- **react-router-dom** - Page navigation

### Backend/Database
- **@supabase/supabase-js** - Database client

### State Management
- **zustand** - Simple state store

### UI/Styling
- **tailwindcss** - Utility CSS framework
- **autoprefixer** - CSS compatibility
- **postcss** - CSS processing

### Utilities
- **date-fns** - Date formatting
- **react-hot-toast** - Notifications

### Development Tools
- **vite** - Build tool
- **@vitejs/plugin-react** - React support for Vite
- **eslint** - Code linting

---

## 🔐 Environment Variables

```
.env file (you create this)
│
├── VITE_SUPABASE_URL
│   └── Your Supabase project URL
│       Example: https://abc123.supabase.co
│
└── VITE_SUPABASE_ANON_KEY
    └── Your public API key
        Example: eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

**Where to get these:**
1. Go to Supabase dashboard
2. Settings → API
3. Copy both values

---

## 🎨 Styling System

### Tailwind CSS Classes
Defined in `index.css`:

```css
.btn          → Button base styles
.btn-primary  → Blue primary button
.btn-secondary→ Gray secondary button
.btn-danger   → Red danger button
.card         → White card with shadow
.input        → Form input field
.label        → Form label text
```

**Usage**:
```jsx
<button className="btn btn-primary">Click Me</button>
<div className="card">Content here</div>
<input className="input" />
```

---

## 🧪 Development Workflow

### Daily Development
```bash
# 1. Start the dev server
npm run dev

# 2. Open http://localhost:3000

# 3. Edit files in src/

# 4. Save → browser auto-refreshes!
```

### Adding a New Page
```bash
# 1. Create file
src/pages/NewPage.jsx

# 2. Add route in
src/App.jsx

# 3. Add nav link in
src/components/Layout.jsx
```

### Adding a New Feature
```bash
# 1. Check roadmap
DEVELOPMENT_ROADMAP.md

# 2. Plan database changes
DATABASE_SCHEMA.md

# 3. Create/update table in Supabase

# 4. Build the UI in src/pages/

# 5. Test it!
```

---

## 🚀 Build & Deploy

### Local Development
```bash
npm run dev
# Runs on http://localhost:3000
```

### Production Build
```bash
npm run build
# Creates dist/ folder with optimized files
```

### Preview Production Build
```bash
npm run preview
# Test production build locally
```

### Deploy to Vercel
```bash
# 1. Push to GitHub
git push

# 2. Import in Vercel
# Go to vercel.com

# 3. Add environment variables
# Same as .env file

# 4. Deploy!
# Live in ~2 minutes
```

---

## 🎯 Where to Start

### New to the Project?
```
1. Read START_HERE.md
2. Follow QUICK_START.md
3. Explore the running app
4. Read this file (PROJECT_MAP.md)
5. Start modifying code!
```

### Want to Build Features?
```
1. Check DEVELOPMENT_ROADMAP.md
2. Pick a Phase 1 feature
3. Look at similar page in src/pages/
4. Copy and modify
5. Test and deploy!
```

### Stuck on Something?
```
1. Check INDEX.md for relevant doc
2. Read troubleshooting in README.md
3. Check Supabase docs
4. Google the error message
```

---

## 📈 Project Growth Path

### Week 1: Setup
- Get app running
- Understand structure
- Make small changes

### Week 2-4: First Feature
- Build practice scheduling
- Learn database queries
- Test with small group

### Month 2: Core Features
- Build roster management
- Build lineup builder
- Add announcements

### Month 3: Polish & Deploy
- Fix bugs
- Improve UI/UX
- Deploy to production
- Full team rollout

---

## 🎓 Learning Each File

### Start With (Easy)
1. `src/pages/Dashboard.jsx` - Simple display
2. `src/pages/Profile.jsx` - Form handling
3. `src/components/Layout.jsx` - Component structure

### Then Study (Medium)
4. `src/store/authStore.js` - State management
5. `src/App.jsx` - Routing
6. `src/lib/supabase.js` - Database connection

### Finally Master (Advanced)
7. Database schema and RLS policies
8. Build system configuration
9. Deployment and optimization

---

## ✅ Quick Reference

| I want to... | Edit this file |
|--------------|----------------|
| Change home page | `src/pages/Dashboard.jsx` |
| Add a new page | Create in `src/pages/` |
| Modify navigation | `src/components/Layout.jsx` |
| Change colors | `tailwind.config.js` |
| Add database table | Supabase SQL Editor |
| Update user fields | Supabase → `profiles` table |
| Fix login issues | `src/store/authStore.js` |
| Change app title | `index.html` |

---

**You now have a complete map of the entire project!** 🗺️

Return to [START_HERE.md](START_HERE.md) to begin your journey!

Happy paddling! 🐉🚣
