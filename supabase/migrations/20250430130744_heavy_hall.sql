/*
  # Fix foreign key relationships for friends table
  
  1. Changes
    - Safely drop existing foreign key constraints if they exist
    - Add correct foreign key constraints referencing the profiles table
    - Add ON DELETE CASCADE for referential integrity
  
  2. Security
    - No changes to RLS policies
*/

-- First, safely drop existing foreign key constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'friends_user_id_fkey'
    AND table_name = 'friends'
  ) THEN
    ALTER TABLE friends DROP CONSTRAINT friends_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'friends_friend_id_fkey'
    AND table_name = 'friends'
  ) THEN
    ALTER TABLE friends DROP CONSTRAINT friends_friend_id_fkey;
  END IF;
END $$;

-- Add the correctly named foreign key constraints
ALTER TABLE friends
ADD CONSTRAINT friends_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

ALTER TABLE friends
ADD CONSTRAINT friends_friend_id_fkey 
FOREIGN KEY (friend_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;