/*
  # Add RLS policies for hashtag table

  1. Security
    - Enable RLS on hashtag table
    - Add policies for:
      - Public read access to all hashtags
      - Users can create hashtags for their own tags
      - Users can delete hashtags for their own tags
*/

-- Enable RLS
ALTER TABLE hashtag ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read hashtags
CREATE POLICY "Anyone can read hashtags"
  ON hashtag
  FOR SELECT
  USING (true);

-- Allow users to create hashtags for their own tags
CREATE POLICY "Users can create hashtags for their own tags"
  ON hashtag
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = hashtag.tag_id
      AND tags.user_id = auth.uid()
    )
  );

-- Allow users to delete hashtags for their own tags
CREATE POLICY "Users can delete hashtags for their own tags"
  ON hashtag
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = hashtag.tag_id
      AND tags.user_id = auth.uid()
    )
  );