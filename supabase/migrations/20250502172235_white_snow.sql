/*
  # Update friends table RLS policies

  1. Changes
    - Simplify the friend request insert policy to only check:
      - User is authenticated
      - User is sending the request (user_id matches authenticated user)
      - Not sending request to themselves
      - Request status is 'pending'
    - Keep existing update and delete policies

  2. Security
    - Maintains core security requirements
    - Prevents self-friending
    - Ensures only pending requests can be created
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "enable_friend_request_send" ON "public"."friends";

-- Create new simplified insert policy
CREATE POLICY "enable_friend_request_send"
ON "public"."friends"
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create requests from themselves
  auth.uid() = user_id
  -- Cannot friend yourself
  AND user_id <> friend_id
  -- New requests must be pending
  AND status = 'pending'
);