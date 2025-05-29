/*
  # Add friends table and relationships

  1. New Tables
    - `friends`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `friend_id` (uuid, references profiles)
      - `status` (text, either 'pending' or 'accepted')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on friends table
    - Add policies for:
      - Reading own friend connections
      - Creating friend requests
      - Updating friend request status
      - Deleting friend connections
*/

DO $$ BEGIN
  -- Create friends table if it doesn't exist
  CREATE TABLE IF NOT EXISTS friends (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    status text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT friends_status_check CHECK (status IN ('pending', 'accepted')),
    CONSTRAINT friends_unique_connection UNIQUE(user_id, friend_id)
  );

  -- Enable RLS
  ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

  -- Create policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can read their own friend connections'
  ) THEN
    CREATE POLICY "Users can read their own friend connections"
      ON friends
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can create friend requests'
  ) THEN
    CREATE POLICY "Users can create friend requests"
      ON friends
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id AND auth.uid() != friend_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can update friend request status'
  ) THEN
    CREATE POLICY "Users can update friend request status"
      ON friends
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = friend_id AND status = 'pending')
      WITH CHECK (status = 'accepted');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can delete friend connections'
  ) THEN
    CREATE POLICY "Users can delete friend connections"
      ON friends
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id OR auth.uid() = friend_id);
  END IF;

END $$;