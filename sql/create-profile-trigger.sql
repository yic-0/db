-- AUTOMATIC PROFILE CREATION TRIGGER
-- This creates a profile automatically when a user signs up
-- Run this in Supabase SQL Editor

-- Step 1: Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger that fires when new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Update RLS policies to allow the trigger to insert
-- Remove the INSERT policy for users (since trigger handles it)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Keep the SELECT and UPDATE policies
-- Users can view active profiles
CREATE POLICY "Enable read access for all users" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
