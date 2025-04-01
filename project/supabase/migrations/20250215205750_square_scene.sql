/*
  # Fix Matching Function

  1. Changes
    - Drop all existing matching functions
    - Create single, clean matching function
    - Update matching presence handling

  2. Security
    - Maintain RLS policies
    - Keep development mode support
*/

-- Drop all existing matching functions
DROP FUNCTION IF EXISTS find_active_match(uuid, text);
DROP FUNCTION IF EXISTS find_active_match(uuid, text, jsonb);
DROP FUNCTION IF EXISTS find_best_match(uuid, text);
DROP FUNCTION IF EXISTS find_best_match(uuid, text, jsonb);

-- Create single, clean matching function
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
) AS $$
DECLARE
  matched_record RECORD;
BEGIN
  -- Update or insert presence
  INSERT INTO matching_presence (user_id, status, role)
  VALUES (search_user_id, 'searching', search_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = 'searching',
    role = search_role,
    last_seen = now();

  -- Find match
  SELECT 
    u.id,
    1.0::float as score,
    u.username,
    u.avatar_url,
    u.bio
  INTO matched_record
  FROM users u
  JOIN matching_presence mp ON u.id = mp.user_id
  WHERE mp.status = 'searching'
    AND mp.role = CASE 
      WHEN search_role = 'hero' THEN 'uplifter'
      ELSE 'hero'
    END
    AND u.id != search_user_id
    AND NOT EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.status = 'active'
      AND (
        (s.hero_id = search_user_id AND s.uplifter_id = u.id)
        OR 
        (s.uplifter_id = search_user_id AND s.hero_id = u.id)
      )
    )
  ORDER BY mp.last_seen DESC
  LIMIT 1;

  -- If match found, update their presence
  IF matched_record IS NOT NULL THEN
    UPDATE matching_presence
    SET status = 'matched'
    WHERE user_id = matched_record.id;

    RETURN QUERY
    SELECT 
      matched_record.id,
      matched_record.score,
      matched_record.username,
      matched_record.avatar_url,
      matched_record.bio;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_matching_presence_status_role 
  ON matching_presence(status, role);

-- Add index for sessions status
CREATE INDEX IF NOT EXISTS idx_sessions_active_status 
  ON sessions(status) 
  WHERE status = 'active';