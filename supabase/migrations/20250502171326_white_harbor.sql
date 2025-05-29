/*
  # Fix Friends Table RLS Policies

  1. Changes
    - Drop existing restrictive RLS policies
    - Add new policies that properly handle friend requests:
      - Allow users to send friend requests
      - Allow users to accept/reject received requests
      - Allow users to view their friend relationships
      - Allow users to delete friend relationships they're part of
  
  2. Security
    - Maintain data security by ensuring users can only:
      - Send requests to other users
      - Manage requests they're involved in
      - View relationships they're part of
*/

-- Drop existing policies
DROP POLICY IF EXISTS "delete_friend_relationship" ON friends;
DROP POLICY IF EXISTS "insert_friend_requests" ON friends;
DROP POLICY IF EXISTS "select_friend_relationships" ON friends;
DROP POLICY IF EXISTS "update_friend_request_status" ON friends;

-- Create new, more permissive policies
CREATE POLICY "enable_friend_request_send"
ON friends
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create requests where they are the sender
  auth.uid() = user_id
  -- Cannot send request to self
  AND user_id != friend_id
  -- Prevent duplicate friend requests
  AND NOT EXISTS (
    SELECT 1 FROM friends f
    WHERE (f.user_id = auth.uid() AND f.friend_id = friends.friend_id)
    OR (f.friend_id = auth.uid() AND f.user_id = friends.friend_id)
  )
);

CREATE POLICY "enable_friend_request_read"
ON friends
FOR SELECT
TO authenticated
USING (
  -- Users can see requests where they are either the sender or receiver
  auth.uid() = user_id OR auth.uid() = friend_id
);

CREATE POLICY "enable_friend_request_update"
ON friends
FOR UPDATE
TO authenticated
USING (
  -- Only the recipient can update the request status
  auth.uid() = friend_id
  AND status = 'pending'
)
WITH CHECK (
  -- Can only update to accepted or cancelled
  status IN ('accepted', 'cancelled')
);

CREATE POLICY "enable_friend_request_delete"
ON friends
FOR DELETE
TO authenticated
USING (
  -- Users can delete relationships they're part of
  auth.uid() = user_id OR auth.uid() = friend_id
);