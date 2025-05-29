/*
  # Fix Profiles Table RLS Policies

  1. Changes
    - Drop existing RLS policies that are causing issues
    - Create new, properly configured RLS policies for the profiles table
    
  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Public read access to all profiles
      - Authenticated users can create their own profile
      - Users can update their own profile
      - Users can delete their own profile
    
  3. Notes
    - Public read access is necessary for viewing profiles across the application
    - Write operations are restricted to profile owners only
*/

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Everyone can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies

-- Allow public read access to all profiles
CREATE POLICY "Allow public read access to all profiles"
ON profiles
FOR SELECT
USING (true);

-- Allow authenticated users to create their own profile
CREATE POLICY "Allow users to create their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Allow users to delete their own profile"
ON profiles
FOR DELETE
USING (auth.uid() = id);