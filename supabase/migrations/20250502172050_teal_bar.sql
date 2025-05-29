/*
  # Fix Friends Table RLS Policies

  1. Changes
    - Drop existing insert policy that's causing the 403 error
    - Create new, corrected insert policy for friend requests
    
  2. Security
    - Maintains security by ensuring users can only:
      - Send friend requests as themselves
      - Not send requests to themselves
      - Not create duplicate friend requests
*/

-- Drop the existing problematic insert policy
DROP POLICY IF EXISTS "enable_friend_request_send" ON friends;

-- Create new, corrected insert policy
CREATE POLICY "enable_friend_request_send" ON friends
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User can only create requests as themselves
  auth.uid() = user_id 
  -- Cannot send friend request to yourself
  AND user_id != friend_id 
  -- Prevent duplicate friend requests (in either direction)
  AND NOT EXISTS (
    SELECT 1 FROM friends f
    WHERE 
      (f.user_id = auth.uid() AND f.friend_id = friends.friend_id)
      OR 
      (f.friend_id = auth.uid() AND f.user_id = friends.friend_id)
  )
  -- Ensure status is 'pending' for new requests
  AND status = 'pending'
);