# Getting Started - Your First Steps

Welcome! This guide will get you from zero to a running app in just a few steps.

## 📋 What You Need

Before starting, make sure you have:

- [ ] A computer with internet connection
- [ ] Node.js installed ([download here](https://nodejs.org/))
- [ ] A text editor (VS Code recommended)
- [ ] A Supabase account (we'll create this together)
- [ ] 30 minutes of time

## 🎯 Quick Decision: Which Guide Should I Follow?

**Choose based on your experience level:**

### 🚀 "Just get it running!" → Follow [QUICK_START.md](QUICK_START.md)
- **Time**: 15 minutes
- **Best for**: People who want to see it working ASAP
- **What you get**: Running app with authentication

### 📚 "I want to understand everything" → Follow [README.md](README.md)
- **Time**: 45 minutes
- **Best for**: People who want detailed explanations
- **What you get**: Complete understanding + running app

### 🔧 "I need help with Supabase" → Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- **Time**: 20 minutes
- **Best for**: People stuck on database setup
- **What you get**: Working database + authentication

## 🗺️ The Complete Journey

Here's the full path from start to finish:

```
1. Install Dependencies (2 min)
   └─> npm install
        │
2. Create Supabase Account (3 min)
   └─> Sign up at supabase.com
        │
3. Set Up Database (10 min)
   └─> Run SQL to create tables
        │
4. Configure App (2 min)
   └─> Copy credentials to .env
        │
5. Start App (1 min)
   └─> npm run dev
        │
6. Create Account (2 min)
   └─> Sign up in the app
        │
7. Make Yourself Admin (1 min)
   └─> Update role in Supabase
        │
8. Start Using! ✅
   └─> Create practices, manage roster, build lineups
```

## 📚 Documentation Overview

We've created comprehensive docs for you:

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **QUICK_START.md** | Get running in 15 minutes | Start here! |
| **README.md** | Full documentation | After quick start |
| **SUPABASE_SETUP.md** | Database setup guide | When setting up database |
| **DATABASE_SCHEMA.md** | Database structure reference | When adding features |
| **DEVELOPMENT_ROADMAP.md** | Future features plan | When planning development |
| **PROJECT_SUMMARY.md** | Technical overview | For developers |
| **GETTING_STARTED.md** | This file! | You're reading it 😊 |

## 🎓 Learning Path

### Phase 1: Get It Running (Day 1)
1. Read **QUICK_START.md**
2. Follow the steps
3. Create your account
4. Explore the app

**Goal**: See it working on your computer

### Phase 2: Understand It (Day 2-3)
1. Read **README.md**
2. Read **PROJECT_SUMMARY.md**
3. Explore the code in `src/`
4. Understand the database schema

**Goal**: Understand how it works

### Phase 3: Customize It (Week 2)
1. Read **DEVELOPMENT_ROADMAP.md**
2. Pick a feature to implement
3. Modify the code
4. Test your changes

**Goal**: Make it your own

### Phase 4: Deploy It (Week 3)
1. Test with your team (5-10 people)
2. Fix issues
3. Deploy to Vercel
4. Invite full team

**Goal**: Get your team using it!

## 🛠️ Installation Steps (Detailed)

### Step 1: Check Node.js

Open terminal/command prompt:

```bash
node --version
```

You should see `v18.0.0` or higher. If not:
- Go to https://nodejs.org/
- Download LTS version
- Install it
- Restart terminal

### Step 2: Navigate to Project

```bash
cd TeamOrganizationApp
```

### Step 3: Install Dependencies

```bash
npm install
```

This downloads all required packages (React, Vite, Tailwind, etc.)

**Expected output**:
```
added 234 packages in 45s
```

**If you see errors**:
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

## 🔑 Supabase Setup (Simplified)

### Why Supabase?

Think of Supabase as:
- **Database**: Where all data is stored (practices, members, lineups)
- **Authentication**: How users log in
- **API**: How the app talks to the database
- **All in one place**: No separate backend server needed!

### Create Your Supabase Project

1. **Go to**: https://supabase.com
2. **Click**: "Start your project"
3. **Sign in** with GitHub or email
4. **Click**: "New project"
5. **Fill in**:
   - Name: `dragon-boat-team`
   - Password: Make it strong! (You won't need to remember it)
   - Region: Closest to you
6. **Wait**: 2-3 minutes for setup

### Get Your Keys

1. Click **Settings** (⚙️ icon)
2. Click **API**
3. You'll see:
   - **Project URL**: `https://abc123.supabase.co`
   - **anon public key**: `eyJhbGc...` (very long)

**Copy both!** You'll paste them in `.env` file.

## 📝 Configure Environment Variables

### What are Environment Variables?

They're secret settings that tell your app how to connect to Supabase.

### Set Them Up

**Option 1: Use a text editor**
1. Open project in VS Code
2. Copy `.env.example` → create new file `.env`
3. Paste your Supabase URL and key
4. Save

**Option 2: Use command line**
```bash
# Copy the example
copy .env.example .env

# Edit with notepad (Windows)
notepad .env

# Edit with nano (Mac/Linux)
nano .env
```

**Your `.env` should look like:**
```
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

⚠️ **IMPORTANT**: Never share these keys publicly!

## 🗄️ Create Database Tables

This is the most important step!

### Quick Method (Recommended)

1. **Open** Supabase project
2. **Click** SQL Editor (📝 icon)
3. **Click** "New Query"
4. **Open** `SUPABASE_SETUP.md` in this project
5. **Copy** the big SQL block (Step 4)
6. **Paste** into SQL Editor
7. **Click** "Run" or press Ctrl+Enter
8. **Success!** You should see "Success. No rows returned"

Repeat for RLS policies (Step 5 in SUPABASE_SETUP.md)

### Verify It Worked

1. Click **Table Editor** (📊 icon)
2. You should see 6 tables:
   - profiles
   - practices
   - rsvps
   - lineups
   - announcements
   - attendance_records

✅ If you see them all, you're golden!

## 🚀 Launch the App

```bash
npm run dev
```

**Expected output**:
```
  VITE v5.1.0  ready in 432 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Your browser should open automatically!**

If not, go to: http://localhost:3000

## 👤 Create Your Account

1. You'll see the login page
2. Click **"Don't have an account? Sign Up"**
3. Enter:
   - Full name
   - Email
   - Password (min 6 characters)
4. Click **"Sign Up"**
5. Check your email for verification link
6. Click the link
7. Return to app and sign in

## 🔐 Make Yourself Admin

Right now you're a regular member. Let's make you admin:

1. **Go to** Supabase project
2. **Click** Table Editor
3. **Click** `profiles` table
4. **Find** your row (your email)
5. **Double-click** the `role` cell
6. **Change** from `member` to `admin`
7. **Click** checkmark ✓ to save
8. **Refresh** your app

Now you can create practices, manage the team, etc.!

## ✅ Success Checklist

After following the steps, you should be able to:

- [ ] App runs at http://localhost:3000
- [ ] You can sign in with your account
- [ ] You see the Dashboard page
- [ ] You can click "Profile" and see your info
- [ ] You can navigate to all pages (Practices, Roster, etc.)
- [ ] Your role is "admin" (check Profile page or Supabase)

**If all checked: Congratulations! 🎉**

## 🆘 Troubleshooting

### "Missing Supabase environment variables"
**Cause**: `.env` file missing or incorrect
**Fix**:
1. Check `.env` file exists
2. Variable names must be exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. No spaces around `=`
4. Restart dev server

### Can't sign in
**Cause**: Email not verified
**Fix**:
1. Check email (including spam folder)
2. Click verification link
3. Try signing in again

### Database errors
**Cause**: Tables not created or RLS not set up
**Fix**:
1. Go to Supabase → Table Editor
2. Verify all 6 tables exist
3. Run RLS policies SQL again

### App won't start
**Cause**: Package issues
**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Still stuck?
1. Check all docs again
2. Review error messages carefully
3. Search the error on Google
4. Check Supabase logs (Settings → Logs)

## 🎯 What's Next?

### Immediate Next Steps:
1. ✅ Complete your profile (add phone, preferences, etc.)
2. ✅ Invite 1-2 teammates to test
3. ✅ Create a test practice
4. ✅ Explore all the pages

### This Week:
1. Read through the code in `src/` folder
2. Understand how pages work
3. Read `DEVELOPMENT_ROADMAP.md`
4. Plan which features to build first

### This Month:
1. Implement practice scheduling (first priority)
2. Build the roster page
3. Create lineup builder
4. Test with 10-20 team members
5. Deploy to Vercel

### This Season:
1. Get full team using it (100+ members)
2. Gather feedback
3. Add requested features
4. Make it your team's primary tool!

## 📖 Recommended Reading Order

1. **QUICK_START.md** ← Start here
2. **This file** ← You're here!
3. **README.md** ← Full documentation
4. **DEVELOPMENT_ROADMAP.md** ← Future features
5. **DATABASE_SCHEMA.md** ← When building features
6. **PROJECT_SUMMARY.md** ← Technical deep dive

## 💡 Pro Tips

1. **Start small**: Don't try to build everything at once
2. **Test often**: Test each feature as you build it
3. **Use git**: Commit your changes regularly
4. **Ask for help**: Dragon boat community is friendly!
5. **Have fun**: This is for your team, enjoy the process!

## 🎊 You're Ready!

You now have everything you need to build an amazing team management app.

**Go to [QUICK_START.md](QUICK_START.md) to begin!**

Happy paddling! 🐉🚣‍♂️
