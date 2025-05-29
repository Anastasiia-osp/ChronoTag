/*
  # Messages Table Migration
  
  1. Changes
    - Create messages table if it doesn't exist
    - Enable RLS
    - Add policies for message access control
    
  2. Security
    - Users can only read their own messages
    - Users can only send messages as themselves
    - Users can only update their own sent messages
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
  DROP POLICY IF EXISTS "Users can send messages" ON messages;
  DROP POLICY IF EXISTS "Users can update their own sent messages" ON messages;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Policy to allow users to read their own messages
CREATE POLICY "Users can read their own messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy to allow users to send messages
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy to allow users to update their own sent messages
CREATE POLICY "Users can update their own sent messages"
  ON messages
  FOR UPDATE
  USING (auth.uid() = sender_id);