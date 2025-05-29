/*
  # Add friends-only visibility option

  1. Changes
    - Update visibility check constraint to include 'friends' option
    - Update RLS policies to handle friends-only visibility
    - Add policy for viewing friends-only tags
    
  2. Security
    - Users can see their own tags
    - Users can see public tags
    - Users can see friends-only tags if they are friends with the tag creator
*/

-- First, drop the existing visibility check constraint if it exists
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_visibility_check;

-- Add new check constraint with 'friends' option
ALTER TABLE tags
ADD CONSTRAINT tags_visibility_check
CHECK (visibility IN ('публичная', 'личная', 'друзьям'));

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can see their own tags or public tags" ON tags;

-- Create new SELECT policy that includes friends visibility
CREATE POLICY "Users can see their own tags or public tags or friends tags"
ON tags
FOR SELECT
TO public
USING (
  auth.uid() = user_id
  OR visibility = 'публичная'
  OR (
    visibility = 'друзьям'
    AND EXISTS (
      SELECT 1 FROM friends
      WHERE (
        (friends.user_id = auth.uid() AND friends.friend_id = tags.user_id)
        OR 
        (friends.friend_id = auth.uid() AND friends.user_id = tags.user_id)
      )
      AND friends.status = 'accepted'
    )
  )
);