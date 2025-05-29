/*
  # Update tag visibility policies

  1. Changes
    - Update RLS policies for the tags table to handle public and private visibility
    - Users can see their own tags regardless of visibility
    - Users can only see other users' tags if they are marked as public

  2. Security
    - Enable RLS on tags table (if not already enabled)
    - Update SELECT policy to handle visibility rules
*/

-- First, ensure RLS is enabled
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies if they exist
DROP POLICY IF EXISTS "Users can see their tags or public & active tags" ON tags;

-- Create new SELECT policy that handles visibility
CREATE POLICY "Users can see their own tags or public tags"
ON tags
FOR SELECT
TO public
USING (
  (auth.uid() = user_id) OR 
  (visibility = 'публичная')
);