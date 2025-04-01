/*
  # Fix matching logic

  1. Changes
    - Simplify matching presence tracking
    - Add better logging for matching process
    - Fix role-based matching
    - Add cleanup for stale presence records

  2. Security
    - Maintain existing RLS policies
    - Add additional checks for user roles
*/

-- Drop existing function to recreate with fixes
DROP FUNCTION IF EXISTS find_active_match(uuid, text);
DROP FUNCTION IF EXISTS cleanup_matching_presence(uuid);

-- Create improved cleanup function
CREATE OR REPLACE FUNCTION cleanup_matching_presence(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete existing presence for the user
  DELETE FROM matching_presence 
  WHERE user_id = target_user_id;
  
  -- Clean up stale presence records
  DELETE FROM matching_presence 
  WHERE last_seen < now() - interval '5 minutes'
  OR status = 'offline';

  -- Log cleanup
  INSERT INTO matching_presence_logs (
    event_type,
    user_id,
    details
  ) VALUES (
    'cleanup',
    target_user_id,
    jsonb_build_object(
      'timestamp', now(),
      'action', 'cleanup_presence'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create matching presence logs table
CREATE TABLE IF NOT EXISTS matching_presence_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES users,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on logs
ALTER TABLE matching_presence_logs ENABLE ROW LEVEL SECURITY;

-- Add policy for logs
CREATE POLICY "Users can view their own logs"
  ON matching_presence_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create improved matching function
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
  opposite_role text;
  matched_record RECORD;
BEGIN
  -- Determine opposite role for matching
  opposite_role := CASE 
    WHEN search_role = 'hero' THEN 'uplifter'
    ELSE 'hero'
  END;

  -- Log search start
  INSERT INTO matching_presence_logs (
    event_type,
    user_id,
    details
  ) VALUES (
    'search_start',
    search_user_id,
    jsonb_build_object(
      'role', search_role,
      'timestamp', now()
    )
  );

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

    -- Log successful match
    INSERT INTO matching_presence_logs (
      event_type,
      user_id,
      details
    ) VALUES (
      'match_found',
      search_user_id,
      jsonb_build_object(
        'matched_with', matched_record.id,
        'timestamp', now()
      )
    );

    RETURN QUERY
    SELECT 
      matched_record.id,
      1.0::float as match_score,
      matched_record.username,
      matched_record.avatar_url,
      matched_record.bio;
  ELSE
    -- Log no match found
    INSERT INTO matching_presence_logs (
      event_type,
      user_id,
      details
    ) VALUES (
      'no_match',
      search_user_id,
      jsonb_build_object(
        'timestamp', now()
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql;