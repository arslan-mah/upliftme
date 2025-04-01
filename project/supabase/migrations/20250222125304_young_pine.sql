-- Add missing columns to sessions table if they don't exist
DO $$ 
BEGIN
  -- Add message column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'message'
  ) THEN
    ALTER TABLE sessions ADD COLUMN message text;
  END IF;

  -- Add note column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'note'
  ) THEN
    ALTER TABLE sessions ADD COLUMN note text;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own emotional tracking" ON emotional_tracking;
DROP POLICY IF EXISTS "Users can view their own emotional tracking" ON emotional_tracking;

-- Add RLS policies for emotional tracking
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

-- Add missing indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_emotional_tracking_session'
  ) THEN
    CREATE INDEX idx_emotional_tracking_session ON emotional_tracking(session_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_emotional_tracking_user'
  ) THEN
    CREATE INDEX idx_emotional_tracking_user ON emotional_tracking(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_emotional_tracking_type'
  ) THEN
    CREATE INDEX idx_emotional_tracking_type ON emotional_tracking(type);
  END IF;
END $$;