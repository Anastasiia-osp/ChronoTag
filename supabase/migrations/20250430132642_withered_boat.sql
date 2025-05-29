/*
  # Add likes table and policies

  1. New Tables
    - `likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `tag_id` (uuid, references tags)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `likes` table
    - Add policies for authenticated users to:
      - Read their own likes
      - Create likes
      - Delete their own likes
*/

CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT likes_unique_user_tag UNIQUE(user_id, tag_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their own likes"
  ON likes
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create likes"
  ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);