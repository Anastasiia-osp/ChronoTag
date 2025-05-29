/*
  # Create profiles table and storage policies

  1. New Tables
    - `profiles`: User profiles with name, nickname, bio, and avatar
  
  2. Security
    - Enable RLS on profiles table
    - Add policies for profile management
    - Create storage bucket and policies for avatars
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text,
  nickname text,
  bio text,
  links jsonb DEFAULT '{}',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Everyone can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Recreate policies
CREATE POLICY "Everyone can read all profiles"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create storage bucket for avatars
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Drop existing storage policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);