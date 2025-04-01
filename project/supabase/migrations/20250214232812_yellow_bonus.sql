/*
  # Update sessions table indexes and policies

  1. Changes
    - Add indexes for better query performance
    - Update policies for proper access control
    - Use started_at for ordering (already exists)

  2. Security
    - Maintain RLS policies for proper access control
    - Allow development access for test user
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_hero_uplifter ON sessions(hero_id, uplifter_id);

-- Update policies to include development access
DROP POLICY IF EXISTS "Users can read their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;

CREATE POLICY "Users can create sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id OR
    (is_development() AND (
      hero_id = '00000000-0000-0000-0000-000000000000' OR
      uplifter_id = '00000000-0000-0000-0000-000000000000'
    ))
  );

CREATE POLICY "Users can read their own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id OR
    (is_development() AND (
      hero_id = '00000000-0000-0000-0000-000000000000' OR
      uplifter_id = '00000000-0000-0000-0000-000000000000'
    ))
  );

CREATE POLICY "Users can update their own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id OR
    (is_development() AND (
      hero_id = '00000000-0000-0000-0000-000000000000' OR
      uplifter_id = '00000000-0000-0000-0000-000000000000'
    ))
  );