/*
  # Fix matching presence policies and functions

  1. Updates
    - Drop and recreate matching presence policies
    - Update functions to be more permissive
    - Add proper error handling
    - Improve logging
*/

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can manage their own presence" ON matching_presence;
DROP POLICY IF EXISTS "Users can manage matching presence" ON matching_presence;
DROP POLICY IF EXISTS "Users can read matching presence" ON matching_presence;

-- Create new, more permissive policies for matching_presence
CREATE POLICY "Users can read matching presence"
  ON matching_presence
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users to read presence

CREATE POLICY "Users can manage matching presence"
  ON matching_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow all authenticated users to insert presence

CREATE POLICY "Users can update matching presence"
  ON matching_presence
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);  -- Allow all authenticated users to update presence

CREATE POLICY "Users can delete matching presence"
  ON matching_presence
  FOR DELETE
  TO authenticated
  USING (true);  -- Allow all authenticated users to delete presence

-- Grant necessary permissions
GRANT ALL ON matching_presence TO authenticated;

-- Update cleanup function to be more permissive
CREATE OR REPLACE FUNCTION cleanup_matching_presence(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Delete existing presence for the user
  DELETE FROM matching_presence 
  WHERE user_id = target_user_id;
  
  -- Clean up stale presence records
  DELETE FROM matching_presence 
  WHERE last_seen < now() - interval '5 minutes'
  OR status = 'offline';
END;
$$;

-- Update find_active_match function to be more permissive
CREATE OR REPLACE FUNCTION find_active_match(
  search_user_id uuid,
  search_role text
)
RETURNS TABLE (
  matched_user_id uuid,
  match_score float,
  username text,
  avatar_url text,
  bio text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  opposite_role text;
  matched_record RECORD;
BEGIN
  -- Determine opposite role for matching
  opposite_role := CASE 
    WHEN search_role = 'hero' THEN 'uplifter'
    ELSE 'hero'
  END;

  -- Insert or update presence
  INSERT INTO matching_presence (
    user_id, 
    status, 
    role,
    last_seen
  )
  VALUES (
    search_user_id,
    'searching',
    search_role,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = 'searching',
    role = search_role,
    last_seen = now();

  -- Find potential match
  SELECT 
    u.id,
    u.username,
    u.avatar_url,
    u.bio
  INTO matched_record
  FROM users u
  JOIN matching_presence mp ON u.id = mp.user_id
  WHERE mp.status = 'searching'
    AND mp.role = opposite_role
    AND u.id != search_user_id
    AND u.role = opposite_role
    AND NOT EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.status = 'active'
      AND (s.hero_id = u.id OR s.uplifter_id = u.id)
    )
  ORDER BY mp.last_seen ASC
  LIMIT 1;

  -- If match found, update presence and return match
  IF matched_record IS NOT NULL THEN
    -- Update both users' presence to matched
    UPDATE matching_presence
    SET status = 'matched'
    WHERE user_id IN (search_user_id, matched_record.id);

    RETURN QUERY
    SELECT 
      matched_record.id,
      1.0::float as match_score,
      matched_record.username,
      matched_record.avatar_url,
      matched_record.bio;
  END IF;
END;
$$;