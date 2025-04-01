/*
  # Real-time Presence and Matching Functions

  1. Functions
    - Cleanup stale presence records
    - Find active matches
    - Process session completion

  2. Triggers
    - Session completion processing
    - Real-time statistics updates

  3. Indexes
    - Optimize presence and matching queries
*/

-- Function to update user presence with cleanup
CREATE OR REPLACE FUNCTION cleanup_stale_presence() RETURNS void AS $$
BEGIN
  UPDATE real_time_presence
  SET status = 'offline'
  WHERE last_seen < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to find active matches
CREATE OR REPLACE FUNCTION find_active_match(
  search_user_id uuid,
  search_role text,
  search_preferences jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  matched_user_id uuid,
  username text,
  avatar_url text,
  bio text,
  match_score float
) AS $$
BEGIN
  -- Only find users who are currently online
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.avatar_url,
    u.bio,
    0.9::float as match_score
  FROM users u
  JOIN real_time_presence rtp ON u.id = rtp.user_id
  WHERE rtp.status = 'online'
    AND rtp.user_role = CASE 
      WHEN search_role = 'hero' THEN 'uplifter'
      ELSE 'hero'
    END
    AND u.id != search_user_id
    AND NOT EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.status = 'active'
      AND (s.hero_id = u.id OR s.uplifter_id = u.id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM matching_queue mq
      WHERE mq.user_id = u.id
    )
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to process session completion
CREATE OR REPLACE FUNCTION process_session_completion()
RETURNS trigger AS $$
BEGIN
  -- Calculate earnings
  NEW.uplifter_earnings := CASE
    WHEN NEW.rating >= 4 THEN 110 -- $1.10 for high ratings
    ELSE 100 -- $1.00 base rate
  END;
  
  NEW.platform_fee := NEW.uplifter_earnings * 10 / 100; -- 10% platform fee
  NEW.amount_paid := NEW.uplifter_earnings + NEW.platform_fee;

  -- Update statistics
  UPDATE user_statistics
  SET 
    total_sessions = total_sessions + 1,
    total_duration = total_duration + 
      EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer / 60,
    total_earnings = CASE 
      WHEN user_id = NEW.uplifter_id THEN total_earnings + NEW.uplifter_earnings
      ELSE total_earnings
    END
  WHERE user_id IN (NEW.hero_id, NEW.uplifter_id);

  -- Cleanup presence after session
  PERFORM cleanup_stale_presence();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session completion
DROP TRIGGER IF EXISTS process_completed_session ON sessions;
CREATE TRIGGER process_completed_session
  BEFORE UPDATE OF ended_at ON sessions
  FOR EACH ROW
  WHEN (OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION process_session_completion();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_real_time_presence_last_seen 
  ON real_time_presence(last_seen);

CREATE INDEX IF NOT EXISTS idx_matching_queue_created 
  ON matching_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_active 
  ON sessions(status) WHERE status = 'active';