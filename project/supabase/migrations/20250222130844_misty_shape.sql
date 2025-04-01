-- Create emotional tracking table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'emotional_tracking'
  ) THEN
    CREATE TABLE emotional_tracking (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES sessions,
      user_id uuid REFERENCES users NOT NULL,
      score integer CHECK (score >= 0 AND score <= 10),
      type text CHECK (type IN ('pre_session', 'post_session')),
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE emotional_tracking ENABLE ROW LEVEL SECURITY;

    -- Add indexes for better performance
    CREATE INDEX idx_emotional_tracking_session ON emotional_tracking(session_id);
    CREATE INDEX idx_emotional_tracking_user ON emotional_tracking(user_id);
    CREATE INDEX idx_emotional_tracking_type ON emotional_tracking(type);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own emotional tracking" ON emotional_tracking;
DROP POLICY IF EXISTS "Users can view their own emotional tracking" ON emotional_tracking;

-- Add RLS policies
CREATE POLICY "Users can insert their own emotional tracking"
  ON emotional_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE POLICY "Users can view their own emotional tracking"
  ON emotional_tracking
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Add columns to sessions table for feedback
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS note text;

-- Create example session data
DO $$ 
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  example_session_id uuid;
BEGIN
  -- Create example session
  INSERT INTO sessions (
    id,
    hero_id,
    uplifter_id,
    status,
    started_at,
    ended_at,
    rating,
    message,
    note,
    amount_paid,
    uplifter_earnings,
    platform_fee
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    test_user_id,
    'completed',
    now() - interval '1 day',
    now() - interval '1 day' + interval '7 minutes',
    5,
    'Great session! Really helped me feel better.',
    'Remember to practice daily gratitude',
    110,
    100,
    10
  )
  RETURNING id INTO example_session_id;

  -- Add emotional tracking data
  INSERT INTO emotional_tracking (
    session_id,
    user_id,
    score,
    type,
    created_at
  ) VALUES 
  (
    example_session_id,
    test_user_id,
    3,
    'pre_session',
    now() - interval '1 day'
  ),
  (
    example_session_id,
    test_user_id,
    8,
    'post_session',
    now() - interval '1 day' + interval '7 minutes'
  );
END $$;