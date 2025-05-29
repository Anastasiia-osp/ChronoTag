/*
  # Update friends table RLS policies

  1. Changes
    - Modify insert policy to properly handle friend requests
    - Update select policy to allow viewing friend relationships
    - Adjust update policy for handling friend request responses
    - Refine delete policy for removing friend relationships

  2. Security
    - Ensure users can only create friend requests from themselves
    - Allow users to see their own friend relationships
    - Enable users to accept/reject friend requests
    - Let users remove their own friend relationships
*/

-- Drop existing policies
DROP POLICY IF EXISTS "insert_friend_requests" ON friends;
DROP POLICY IF EXISTS "select_friend_relationships" ON friends;
DROP POLICY IF EXISTS "update_friend_request_status" ON friends;
DROP POLICY IF EXISTS "delete_friend_relationship" ON friends;

-- Create new policies with proper security checks
CREATE POLICY "insert_friend_requests"
ON friends
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND auth.uid() <> friend_id 
  AND NOT EXISTS (
    SELECT 1 FROM friends 
    WHERE (user_id = auth.uid() AND friend_id = friends.friend_id)
    OR (friend_id = auth.uid() AND user_id = friends.friend_id)
  )
);

CREATE POLICY "select_friend_relationships"
ON friends
FOR SELECT
TO public
USING (
  auth.uid() = user_id 
  OR auth.uid() = friend_id
);

CREATE POLICY "update_friend_request_status"
ON friends
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = friend_id AND status = 'pending')
  OR (auth.uid() = user_id AND status = 'pending')
)
WITH CHECK (
  status IN ('accepted', 'cancelled')
);

CREATE POLICY "delete_friend_relationship"
ON friends
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() = friend_id
);