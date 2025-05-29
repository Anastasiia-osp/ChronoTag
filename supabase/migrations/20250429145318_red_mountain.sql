/*
  # Update title column constraints

  1. Changes
    - Ensures title column has correct constraints
    - Updates any NULL titles with default values
    - Adds character length check
  
  2. Notes
    - Safe migration that checks for column existence
    - Preserves existing data
*/

DO $$ 
BEGIN
  -- Update existing title column constraints
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tags' 
    AND column_name = 'title'
  ) THEN
    -- Update any NULL titles with default values
    UPDATE tags 
    SET title = LEFT(COALESCE(message, 'Untitled'), 120) 
    WHERE title IS NULL;

    -- Add NOT NULL constraint if not present
    ALTER TABLE tags 
    ALTER COLUMN title SET NOT NULL;

    -- Add character length check if not present
    ALTER TABLE tags 
    ADD CONSTRAINT tags_title_length_check 
    CHECK (char_length(title) <= 120) 
    NOT VALID;

    -- Validate the constraint
    ALTER TABLE tags 
    VALIDATE CONSTRAINT tags_title_length_check;
  END IF;
END $$;