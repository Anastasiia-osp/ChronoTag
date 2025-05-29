/*
  # Add read_at column to messages table

  1. Changes
    - Add `read_at` timestamp column to messages table to track when messages are read
    
  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL;