/*
  # Update friends table RLS policies

  1. Changes
    - Remove duplicate and conflicting RLS policies
    - Consolidate policies for better clarity and maintenance
    - Ensure proper access control for friend relationships

  2. Security
    - Enable RLS on friends table (already enabled)
    - Update policies to properly handle friend relationships
    - Maintain security while allowing necessary access
*/

-- First, drop existing conflicting policies
DROP POLICY IF EXISTS "Users can create friend requests" ON friends;
DROP POLICY IF EXISTS "Users can delete friend connections" ON friends;
DROP POLICY IF EXISTS "Users can read their own friend connections" ON friends;
DROP POLICY IF EXISTS "Users can update friend request status" ON friends;
DROP POLICY IF EXISTS "insert_as_self" ON friends;
DROP POLICY IF EXISTS "select_own_relationships" ON friends;

-- Create new consolidated policies
CREATE POLICY "select_friend_relationships" ON friends
FOR SELECT TO public
USING (
  auth.uid() = user_id OR 
  auth.uid() = friend_id
);

CREATE POLICY "insert_friend_requests" ON friends
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  auth.uid() != friend_id AND 
  NOT EXISTS (
    SELECT 1 FROM friends 
    WHERE (
      (user_id = auth.uid() AND friend_id = friends.friend_id) OR 
      (friend_id = auth.uid() AND user_id = friends.friend_id)
    )
  )
);

CREATE POLICY "update_friend_request_status" ON friends
FOR UPDATE TO authenticated
USING (
  (auth.uid() = friend_id AND status = 'pending') OR
  (auth.uid() = user_id AND status = 'pending')
)
WITH CHECK (
  status IN ('accepted', 'cancelled')
);

CREATE POLICY "delete_friend_relationship" ON friends
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id OR 
  auth.uid() = friend_id
);