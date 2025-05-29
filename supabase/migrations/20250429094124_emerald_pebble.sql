/*
  # Enhanced ChronoTag Schema

  1. New Tables
    - `profiles`: User profiles with username, full name, bio, links, and avatar
    - `messages`: Direct messaging between users
  
  2. Changes
    - Added new columns to `tags` table:
      - type (event, announcement, plan)
      - visibility (public, private)
      - hashtag
      - time_range_start and time_range_end
  
  3. Security
    - Enabled RLS on new tables
    - Added policies for profiles and messages
    - Created storage bucket and policies for avatars
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  bio text,
  links jsonb DEFAULT '{}',
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Add new columns to tags table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'type') THEN
    ALTER TABLE tags ADD COLUMN type text CHECK (type IN ('event', 'announcement', 'plan')) DEFAULT 'event';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'visibility') THEN
    ALTER TABLE tags ADD COLUMN visibility text CHECK (visibility IN ('public', 'private')) DEFAULT 'public';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'hashtag') THEN
    ALTER TABLE tags ADD COLUMN hashtag text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'time_range_start') THEN
    ALTER TABLE tags ADD COLUMN time_range_start timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'time_range_end') THEN
    ALTER TABLE tags ADD COLUMN time_range_end timestamptz;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
  DROP POLICY IF EXISTS "Users can send messages" ON messages;
  DROP POLICY IF EXISTS "Users can update their own sent messages" ON messages;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Messages policies
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own sent messages"
  ON messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

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

-- Storage policy for avatars
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