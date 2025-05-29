/*
  # Make nickname field required
  
  1. Changes
    - Make nickname field required in profiles table
    - Update existing rows to have a default nickname if null
  
  2. Security
    - No changes to existing policies
*/

-- First set a default nickname for any existing profiles that have null nicknames
UPDATE profiles 
SET nickname = 'user_' || SUBSTRING(id::text, 1, 8)
WHERE nickname IS NULL;

-- Then make the nickname column required
ALTER TABLE profiles 
ALTER COLUMN nickname SET NOT NULL;