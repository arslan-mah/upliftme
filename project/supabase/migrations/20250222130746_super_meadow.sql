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