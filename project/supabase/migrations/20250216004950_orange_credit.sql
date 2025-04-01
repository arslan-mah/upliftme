-- Drop existing functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS find_active_match(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS cleanup_stale_presence() CASCADE;
DROP FUNCTION IF EXISTS trigger_cleanup_presence() CASCADE;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their own presence" ON matching_presence;

-- Recreate matching presence table with proper constraints
DROP TABLE IF EXISTS matching_presence;
CREATE TABLE matching_presence (
  user_id uuid PRIMARY KEY REFERENCES users,
  status text CHECK (status IN ('searching', 'matched', 'offline')),
  role text CHECK (role IN ('hero', 'uplifter')),
  last_seen timestamptz DEFAULT now(),
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE matching_presence ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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

-- Create function to cleanup presence before finding match
CREATE OR REPLACE FUNCTION cleanup_matching_presence(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete existing presence for the user
  DELETE FROM matching_presence WHERE user_id = target_user_id;
  
  -- Clean up stale presence records
  DELETE FROM matching_presence 
  WHERE last_seen < now() - interval '5 minutes'
  OR status = 'offline';
END;
$$ LANGUAGE plpgsql;

-- Create new matching function with improved error handling
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
  -- Clean up existing presence
  PERFORM cleanup_matching_presence(search_user_id);

  -- Insert new presence record
  INSERT INTO matching_presence (user_id, status, role)
  VALUES (search_user_id, 'searching', search_role);

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
      AND (s.hero_id = u.id OR s.uplifter_id = u.id)
    )
  ORDER BY mp.created_at ASC
  LIMIT 1;

  -- If match found, update their presence
  IF matched_record IS NOT NULL THEN
    UPDATE matching_presence
    SET status = 'matched'
    WHERE user_id IN (search_user_id, matched_record.id);

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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matching_presence_status_role 
  ON matching_presence(status, role);

CREATE INDEX IF NOT EXISTS idx_matching_presence_last_seen 
  ON matching_presence(last_seen);

CREATE INDEX IF NOT EXISTS idx_matching_presence_created 
  ON matching_presence(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_active_users 
  ON sessions(hero_id, uplifter_id) 
  WHERE status = 'active';