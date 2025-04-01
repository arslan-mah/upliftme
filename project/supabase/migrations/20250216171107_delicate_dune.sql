/*
  # Fix matching logs RLS policies

  1. Changes
    - Add INSERT policy for matching_presence_logs
    - Update existing policies for better security
    - Add function-level security

  2. Security
    - Maintain existing RLS policies
    - Add proper INSERT permissions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own logs" ON matching_presence_logs;

-- Add comprehensive policies for matching_presence_logs
CREATE POLICY "Users can view their own logs"
  ON matching_presence_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE POLICY "Users can create their own logs"
  ON matching_presence_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Update the functions to use security definer
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
$$;

-- Update find_active_match function with security definer
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
$$;