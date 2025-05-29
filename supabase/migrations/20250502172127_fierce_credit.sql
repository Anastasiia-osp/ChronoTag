/*
  # Fix Friends Table RLS Policies

  1. Changes
    - Drop existing RLS policies for friends table
    - Create new comprehensive RLS policies that properly handle all friend request scenarios
    
  2. Security
    - Enable RLS on friends table
    - Add policies for:
      - Sending friend requests
      - Accepting/rejecting friend requests
      - Reading friend requests
      - Deleting friend relationships
*/

-- Drop existing policies
DROP POLICY IF EXISTS "enable_friend_request_delete" ON friends;
DROP POLICY IF EXISTS "enable_friend_request_read" ON friends;
DROP POLICY IF EXISTS "enable_friend_request_send" ON friends;
DROP POLICY IF EXISTS "enable_friend_request_update" ON friends;

-- Create new policies
CREATE POLICY "enable_friend_request_read"
ON friends
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  auth.uid() = friend_id
);

CREATE POLICY "enable_friend_request_send"
ON friends
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  user_id != friend_id AND
  status = 'pending' AND
  NOT EXISTS (
    SELECT 1 FROM friends f
    WHERE (
      (f.user_id = auth.uid() AND f.friend_id = friends.friend_id) OR
      (f.friend_id = auth.uid() AND f.user_id = friends.friend_id)
    )
  )
);

CREATE POLICY "enable_friend_request_update"
ON friends
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = friend_id AND status = 'pending') OR
  (auth.uid() = user_id AND status = 'pending')
)
WITH CHECK (
  status IN ('accepted', 'cancelled')
);

CREATE POLICY "enable_friend_request_delete"
ON friends
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR 
  auth.uid() = friend_id
);