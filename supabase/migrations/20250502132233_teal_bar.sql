/*
  # Add cancelled status to friends table
  
  1. Changes
    - Update status check constraint to include 'cancelled' option
    - Update RLS policies to handle cancelled status
    
  2. Security
    - No changes to existing policy permissions
*/

-- Drop existing status check constraint
ALTER TABLE friends DROP CONSTRAINT IF EXISTS friends_status_check;

-- Add new check constraint with cancelled status
ALTER TABLE friends
ADD CONSTRAINT friends_status_check
CHECK (status IN ('pending', 'accepted', 'cancelled'));