/*
  # Add address column to tags table

  1. Changes
    - Add address column to tags table to store location information
*/

ALTER TABLE tags ADD COLUMN IF NOT EXISTS address text;