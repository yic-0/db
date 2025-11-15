# Quick Start Guide

Get your Dragon Boat Team Manager up and running in 15 minutes!

## Prerequisites Checklist

- [ ] Node.js installed (check: `node --version` should show v18+)
- [ ] npm installed (check: `npm --version`)
- [ ] Supabase account created (https://supabase.com)

## 5-Minute Setup

### 1. Install Dependencies (2 minutes)

```bash
cd TeamOrganizationApp
npm install
```

### 2. Create Supabase Project (3 minutes)

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter:
   - Name: `dragon-boat-team`
   - Password: (choose strong password)
   - Region: (closest to you)
4. Click "Create new project"
5. Wait for setup to complete (~2 min)

### 3. Get Credentials (1 minute)

1. Click Settings ⚙️ → API
2. Copy **Project URL**
3. Copy **anon public** key

### 4. Configure App (1 minute)

```bash
# Copy example env file
copy .env.example .env

# Edit .env and paste your credentials
# (Use Notepad or any text editor)
```

Your `.env` should look like:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 5. Create Database Tables (5 minutes)

1. In Supabase, click **SQL Editor**
2. Click **New Query**
3. Open `SUPABASE_SETUP.md` in this project
4. Copy the "Quick Setup" SQL (Step 4)
5. Paste into SQL Editor
6. Click "Run"
7. Copy and run the RLS policies SQL (Step 5)

### 6. Start the App (1 minute)

```bash
npm run dev
```

App opens at http://localhost:3000 🎉

### 7. Create Your Account (2 minutes)

1. Click "Sign Up"
2. Enter email and password
3. Check email for confirmation link
4. Click the link to verify
5. Sign in

### 8. Make Yourself Admin (1 minute)

1. Go to Supabase → **Table Editor**
2. Click `profiles` table
3. Find your row (your email)
4. Double-click the `role` cell
5. Change from `member` to `admin`
6. Click ✓ to save

✅ **Done! You're ready to go!**

## Next Steps

1. Complete your profile (click "Profile" in app)
2. Invite team members (they sign up same way)
3. Create your first practice
4. Start building lineups!

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Need Help?

- **Full setup guide**: See `SUPABASE_SETUP.md`
- **Database schema**: See `DATABASE_SCHEMA.md`
- **General info**: See `README.md`
- **Future features**: See `DEVELOPMENT_ROADMAP.md`

## Quick Troubleshooting

**Problem**: "Missing Supabase environment variables"
- **Solution**: Check `.env` file exists and has correct values

**Problem**: Can't sign in
- **Solution**: Check email for verification link

**Problem**: Database error when creating practice
- **Solution**: Make sure you're admin (check profiles table)

**Problem**: App won't start
- **Solution**:
  ```bash
  rm -rf node_modules
  npm install
  npm run dev
  ```

## Default Ports

- **App**: http://localhost:3000
- **Supabase**: https://[your-project].supabase.co

## File Structure Overview

```
TeamOrganizationApp/
├── src/
│   ├── pages/          ← Your main app pages
│   ├── components/     ← Reusable UI components
│   ├── store/          ← State management
│   └── lib/            ← Utilities (Supabase client)
├── .env                ← Your secrets (DON'T commit!)
└── package.json        ← Dependencies
```

## Adding Team Members

Two ways:

**Option 1: They sign up themselves**
1. Share app URL with team
2. They click "Sign Up"
3. They verify email
4. They're in!

**Option 2: You invite them (future feature)**
- Send invite links with pre-filled email
- Bulk invite via CSV import
- Coming in Phase 1!

## Deployment Preview

When ready to go live (after testing):

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin [your-repo-url]
git push -u origin main

# Deploy to Vercel (free)
# Go to vercel.com → Import → Select repo
# Add same .env variables
# Deploy!
```

Your team can access it at: `https://your-app.vercel.app`

## Tips for First-Time Users

1. **Start small**: Add 5-10 team members first
2. **Test everything**: Create practices, RSVP, build lineups
3. **Get feedback**: Ask team what features they need most
4. **Iterate**: Use the roadmap to prioritize features
5. **Have fun**: This is for your team, make it yours!

## Support

Stuck? Check these in order:
1. This Quick Start Guide
2. README.md
3. SUPABASE_SETUP.md
4. Supabase docs: https://supabase.com/docs
5. React docs: https://react.dev

Happy paddling! 🐉🚣
