/*
  # Fix Messages-Profiles Relationship

  1. Changes
    - Add foreign key constraints between messages and profiles tables
    - Update existing foreign key constraints to reference profiles instead of users
    - Ensure proper cascading behavior for data integrity

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- First, drop existing foreign key constraints if they exist
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

-- Add new foreign key constraints referencing profiles table
ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE messages
ADD CONSTRAINT messages_receiver_id_fkey
FOREIGN KEY (receiver_id)
REFERENCES profiles(id)
ON DELETE CASCADE;