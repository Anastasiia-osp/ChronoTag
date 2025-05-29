/*
  # Create Tags Table
  
  1. New Tables
    - `tags`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `latitude` (float, required)
      - `longitude` (float, required)
      - `message` (text, required)
      - `activation_datetime` (timestamptz, required)
      - `created_at` (timestamptz, default: now())
      
  2. Security
    - Enable RLS on `tags` table
    - Add policies for:
      - Users can read all tags
      - Users can insert their own tags
      - Users can update their own tags
      - Users can delete their own tags
*/

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  latitude float NOT NULL,
  longitude float NOT NULL,
  message text NOT NULL,
  activation_datetime timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read all tags
CREATE POLICY "Anyone can read all tags"
  ON tags
  FOR SELECT
  USING (true);

-- Policy to allow authenticated users to insert their own tags
CREATE POLICY "Users can insert their own tags"
  ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow authenticated users to update their own tags
CREATE POLICY "Users can update their own tags"
  ON tags
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow authenticated users to delete their own tags
CREATE POLICY "Users can delete their own tags"
  ON tags
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);