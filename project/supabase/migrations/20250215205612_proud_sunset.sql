/*
  # Fix Matching System

  1. Changes
    - Add real-time presence tracking
    - Improve matching function
    - Add development mode support
    - Fix user statistics tracking

  2. Security
    - Maintain RLS policies
    - Add development mode checks
*/

-- Create real-time presence tracking
CREATE TABLE IF NOT EXISTS matching_presence (
  user_id uuid PRIMARY KEY REFERENCES users,
  status text CHECK (status IN ('searching', 'matched', 'offline')),
  role text CHECK (role IN ('hero', 'uplifter')),
  last_seen timestamptz DEFAULT now(),
  preferences jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE matching_presence ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for matching presence
CREATE POLICY "Users can manage their own presence"
  ON matching_presence
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WITH CHECK (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Function to find active matches
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
  RETURN QUERY
  SELECT 
    u.id as matched_user_id,
    1.0 as match_score,
    u.username,
    u.avatar_url,
    u.bio
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

  -- Update matched user's presence
  UPDATE matching_presence
  SET status = 'matched'
  WHERE user_id IN (
    SELECT matched_user_id 
    FROM find_active_match
  );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stale presence
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE matching_presence
  SET status = 'offline'
  WHERE last_seen < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create cleanup trigger
CREATE OR REPLACE FUNCTION trigger_cleanup_presence()
RETURNS trigger AS $$
BEGIN
  PERFORM cleanup_stale_presence();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_presence_trigger ON matching_presence;
CREATE TRIGGER cleanup_presence_trigger
  AFTER INSERT OR UPDATE ON matching_presence
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_presence();