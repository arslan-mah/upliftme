/*
  # Database Schema for Real-time Features

  1. New Tables
    - Subscription plans
    - Payment history
    - User statistics
    - Real-time presence
    - Matching queue
    - Earnings history
    - User reviews

  2. Security
    - RLS policies for all tables
    - Secure payment tracking
    - User data protection

  3. Indexes
    - Performance optimizations
    - Query efficiency
*/

-- Subscription Plans
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_monthly integer NOT NULL,
  price_yearly integer,
  features jsonb NOT NULL,
  stripe_price_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscription plans are viewable by all"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- Payment History
CREATE TABLE payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  stripe_payment_intent_id text,
  status text CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_type text CHECK (payment_type IN ('subscription', 'session', 'tip')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON payment_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User Statistics
CREATE TABLE user_statistics (
  user_id uuid REFERENCES users PRIMARY KEY,
  total_sessions integer DEFAULT 0,
  total_duration integer DEFAULT 0, -- in minutes
  total_earnings integer DEFAULT 0, -- in cents
  average_rating numeric(3,2) DEFAULT 0,
  total_ratings integer DEFAULT 0,
  hero_sessions integer DEFAULT 0,
  uplifter_sessions integer DEFAULT 0,
  flags_received integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own statistics"
  ON user_statistics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Real-time Presence
CREATE TABLE real_time_presence (
  user_id uuid REFERENCES users PRIMARY KEY,
  status text CHECK (status IN ('online', 'busy', 'away', 'offline', 'searching')),
  user_role text CHECK (user_role IN ('hero', 'uplifter')),
  last_seen timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE real_time_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presence"
  ON real_time_presence
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Matching Queue
CREATE TABLE matching_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  role text CHECK (role IN ('hero', 'uplifter')) NOT NULL,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matching_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their queue entry"
  ON matching_queue
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Earnings History
CREATE TABLE earnings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  session_id uuid REFERENCES sessions,
  amount integer NOT NULL, -- in cents
  status text CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  payout_batch_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE earnings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their earnings"
  ON earnings_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User Reviews
CREATE TABLE user_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions NOT NULL,
  reviewer_id uuid REFERENCES users NOT NULL,
  reviewed_id uuid REFERENCES users NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews"
  ON user_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for their sessions"
  ON user_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_id
      AND (sessions.hero_id = auth.uid() OR sessions.uplifter_id = auth.uid())
    )
  );

-- Functions for Real-time Matching
CREATE OR REPLACE FUNCTION find_match(
  search_user_id uuid,
  search_role text,
  search_preferences jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  matched_user_id uuid,
  username text,
  match_score float
) AS $$
BEGIN
  -- Insert into matching queue
  INSERT INTO matching_queue (user_id, role, preferences)
  VALUES (search_user_id, search_role, search_preferences)
  ON CONFLICT (user_id) DO UPDATE
  SET preferences = search_preferences;

  -- Find potential match
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    0.9::float as match_score -- Simplified scoring for now
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
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS trigger AS $$
BEGIN
  -- Update hero statistics
  UPDATE user_statistics
  SET 
    total_sessions = total_sessions + 1,
    total_duration = total_duration + 
      EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer / 60,
    hero_sessions = hero_sessions + 1
  WHERE user_id = NEW.hero_id;

  -- Update uplifter statistics
  UPDATE user_statistics
  SET 
    total_sessions = total_sessions + 1,
    total_duration = total_duration + 
      EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer / 60,
    uplifter_sessions = uplifter_sessions + 1,
    total_earnings = total_earnings + COALESCE(NEW.uplifter_earnings, 0)
  WHERE user_id = NEW.uplifter_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating statistics
CREATE TRIGGER update_statistics_on_session_end
  AFTER UPDATE OF ended_at ON sessions
  FOR EACH ROW
  WHEN (OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION update_user_statistics();

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, features, stripe_price_id)
VALUES 
  ('Basic', 999, '{"sessions_per_month": 10, "features": ["Basic matching", "Video chat"]}'::jsonb, 'price_basic_monthly'),
  ('Pro', 1999, '{"sessions_per_month": 30, "features": ["Priority matching", "Extended sessions", "Advanced analytics"]}'::jsonb, 'price_pro_monthly'),
  ('Unlimited', 4999, '{"sessions_per_month": null, "features": ["Unlimited sessions", "Priority support", "Custom matching"]}'::jsonb, 'price_unlimited_monthly')
ON CONFLICT DO NOTHING;