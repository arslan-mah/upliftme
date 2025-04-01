/*
  # Core Functions and Triggers
  
  1. Functions
    - get_user_statistics: Retrieve user stats
    - get_leaderboard: Get top uplifters
    - update_user_presence: Track user online status
    - calculate_session_earnings: Process session payments
    - get_admin_statistics: Admin dashboard data

  2. Triggers
    - Presence tracking
    - Earnings calculation
*/

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sessions', COALESCE(us.total_sessions, 0),
    'total_duration', COALESCE(us.total_duration, 0),
    'total_earnings', COALESCE(us.total_earnings, 0),
    'average_rating', COALESCE(us.average_rating, 0),
    'total_ratings', COALESCE(us.total_ratings, 0),
    'hero_sessions', COALESCE(us.hero_sessions, 0),
    'uplifter_sessions', COALESCE(us.uplifter_sessions, 0),
    'flags_received', COALESCE(us.flags_received, 0),
    'current_rank', (
      SELECT position
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY us2.average_rating DESC) as position
        FROM users u2
        JOIN user_statistics us2 ON u2.id = us2.user_id
        WHERE u2.role = 'uplifter'
      ) ranks
      WHERE id = user_id
    )
  )
  INTO result
  FROM user_statistics us
  WHERE us.user_id = get_user_statistics.user_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_sessions integer,
  average_rating numeric,
  total_earnings integer,
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.avatar_url,
    us.total_sessions,
    us.average_rating,
    us.total_earnings,
    ROW_NUMBER() OVER (ORDER BY us.average_rating DESC, us.total_sessions DESC)
  FROM users u
  JOIN user_statistics us ON u.id = us.user_id
  WHERE u.role = 'uplifter'
  AND us.total_sessions > 0
  ORDER BY us.average_rating DESC, us.total_sessions DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update presence
CREATE OR REPLACE FUNCTION update_user_presence()
RETURNS trigger AS $$
BEGIN
  -- Update or insert presence record
  INSERT INTO real_time_presence (user_id, status, user_role)
  VALUES (
    NEW.id,
    'online',
    NEW.role
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = 'online',
    user_role = NEW.role,
    last_seen = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate session earnings
CREATE OR REPLACE FUNCTION calculate_session_earnings()
RETURNS trigger AS $$
DECLARE
  base_rate integer := 100; -- $1.00 base rate in cents
  duration_minutes integer;
  rating_bonus integer;
BEGIN
  -- Calculate duration in minutes
  duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer / 60;
  
  -- Calculate rating bonus (10% per star above 3)
  rating_bonus := CASE 
    WHEN NEW.rating > 3 THEN (NEW.rating - 3) * 10
    ELSE 0
  END;

  -- Calculate total earnings
  NEW.uplifter_earnings := (base_rate * duration_minutes) * (100 + rating_bonus) / 100;
  NEW.platform_fee := NEW.uplifter_earnings * 10 / 100; -- 10% platform fee
  NEW.amount_paid := NEW.uplifter_earnings + NEW.platform_fee;

  -- Create earnings history record
  INSERT INTO earnings_history (
    user_id,
    session_id,
    amount,
    status
  ) VALUES (
    NEW.uplifter_id,
    NEW.id,
    NEW.uplifter_earnings,
    'pending'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for presence tracking
DROP TRIGGER IF EXISTS track_user_presence ON users;
CREATE TRIGGER track_user_presence
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence();

-- Trigger for earnings calculation
DROP TRIGGER IF EXISTS calculate_earnings ON sessions;
CREATE TRIGGER calculate_earnings
  BEFORE UPDATE OF ended_at, rating ON sessions
  FOR EACH ROW
  WHEN (OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION calculate_session_earnings();

-- Function to get admin dashboard statistics
CREATE OR REPLACE FUNCTION get_admin_statistics()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users', (SELECT COUNT(*) FROM real_time_presence WHERE status = 'online'),
    'total_sessions', (SELECT COUNT(*) FROM sessions WHERE status = 'completed'),
    'total_revenue', (SELECT COALESCE(SUM(amount_paid), 0) FROM sessions),
    'average_rating', (
      SELECT COALESCE(AVG(rating), 0)
      FROM sessions 
      WHERE rating IS NOT NULL
    ),
    'active_sessions', (
      SELECT COUNT(*)
      FROM sessions
      WHERE status = 'active'
    ),
    'total_uplifters', (
      SELECT COUNT(*)
      FROM users
      WHERE role = 'uplifter'
    ),
    'total_heroes', (
      SELECT COUNT(*)
      FROM users
      WHERE role = 'hero'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;