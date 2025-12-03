# Replit Deployment Setup

## Environment Variables

Copy the `.env` file to your project root, then replace the placeholder values with your actual keys.

### Required Variables

1. **VITE_SUPABASE_URL**
   - Go to https://app.supabase.com
   - Select your project
   - Go to Settings > API
   - Copy the "Project URL"

2. **VITE_SUPABASE_ANON_KEY**
   - Same location as above
   - Copy the "anon public" key (safe for frontend)
   - DO NOT use the service_role key in frontend code

### Optional Variables

3. **VITE_VAPID_PUBLIC_KEY** (for push notifications)
   - Generate at https://vapidkeys.com
   - Only needed if using push notification features

## Replit Secrets

Instead of a `.env` file, you can use Replit Secrets:

1. Open your Replit project
2. Click the lock icon (Secrets) in the left sidebar
3. Add each variable:
   - Key: `VITE_SUPABASE_URL`
   - Value: your Supabase project URL

Repeat for all environment variables.

## Important Security Notes

- Never commit `.env` files with real keys to git
- The anon key is safe for frontend (has Row Level Security)
- Keep service_role keys server-side only
