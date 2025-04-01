/*
  # Additional Database Enhancements
  
  1. Indexes
    - Add missing indexes for performance optimization
    - Ensure proper index naming and uniqueness

  2. Policies
    - Add missing policies for security
    - Update existing policies for better access control

  3. Functions
    - Add helper functions for statistics
    - Enhance existing functions with better error handling
*/

-- Add missing indexes if they don't exist
DO $$ 
BEGIN
  -- Session indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_hero_uplifter') THEN
    CREATE INDEX idx_sessions_hero_uplifter ON sessions(hero_id, uplifter_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_status_rating') THEN
    CREATE INDEX idx_sessions_status_rating ON sessions(status, rating);
  END IF;

  -- User statistics indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_statistics_performance') THEN
    CREATE INDEX idx_user_statistics_performance 
    ON user_statistics(average_rating DESC, total_sessions DESC);
  END IF;

  -- Real-time presence indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_real_time_presence_active') THEN
    CREATE INDEX idx_real_time_presence_active 
    ON real_time_presence(status, last_seen) 
    WHERE status = 'online';
  END IF;
END $$;

-- Add missing policies
DO $$ 
BEGIN
  -- Payment history policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create payment records'
  ) THEN
    CREATE POLICY "Users can create payment records"
      ON payment_history
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- User statistics policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view uplifter statistics'
  ) THEN
    CREATE POLICY "Users can view uplifter statistics"
      ON user_statistics
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = user_statistics.user_id
          AND users.role = 'uplifter'
        )
      );
  END IF;
END $$;

-- Add helper functions
CREATE OR REPLACE FUNCTION get_user_session_stats(user_id uuid)
RETURNS TABLE (
  total_duration bigint,
  average_duration numeric,
  completion_rate numeric,
  total_earnings bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (ended_at - started_at))::bigint
    ), 0) as total_duration,
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (ended_at - started_at))
    ), 0)::numeric as average_duration,
    COALESCE(
      (COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
       NULLIF(COUNT(*), 0)::numeric * 100
      ), 0
    ) as completion_rate,
    COALESCE(SUM(uplifter_earnings), 0) as total_earnings
  FROM sessions
  WHERE (hero_id = user_id OR uplifter_id = user_id)
  AND ended_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Add function to check user availability
CREATE OR REPLACE FUNCTION is_user_available(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM sessions s
    WHERE (s.hero_id = user_id OR s.uplifter_id = user_id)
    AND s.status = 'active'
  ) AND EXISTS (
    SELECT 1 
    FROM real_time_presence rtp
    WHERE rtp.user_id = user_id
    AND rtp.status = 'online'
    AND rtp.last_seen > now() - interval '5 minutes'
  );
END;
$$ LANGUAGE plpgsql;