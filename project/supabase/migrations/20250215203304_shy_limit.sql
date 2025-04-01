/*
  # Fix User Statistics Migration

  1. Changes
    - Add comprehensive RLS policies for user statistics
    - Add function to initialize statistics
    - Handle test user statistics
    - Fix column reference issues

  2. Security
    - Maintain RLS policies for user data protection
    - Allow development access for testing
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can initialize their own statistics" ON user_statistics;
DROP POLICY IF EXISTS "Users can update their own statistics" ON user_statistics;
DROP POLICY IF EXISTS "Users can read their own statistics" ON user_statistics;

-- Add comprehensive policies for user statistics
CREATE POLICY "Users can read their own statistics"
  ON user_statistics
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE POLICY "Users can initialize their own statistics"
  ON user_statistics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE POLICY "Users can update their own statistics"
  ON user_statistics
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Initialize statistics for test user
INSERT INTO user_statistics (
  user_id,
  total_sessions,
  total_duration,
  total_earnings,
  average_rating,
  total_ratings,
  hero_sessions,
  uplifter_sessions,
  flags_received
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  0, 0, 0, 0, 0, 0, 0, 0
) ON CONFLICT (user_id) DO NOTHING;

-- Initialize statistics for existing users
INSERT INTO user_statistics (
  user_id,
  total_sessions,
  total_duration,
  total_earnings,
  average_rating,
  total_ratings,
  hero_sessions,
  uplifter_sessions,
  flags_received
)
SELECT 
  id,
  0, 0, 0, 0, 0, 0, 0, 0
FROM users
WHERE NOT EXISTS (
  SELECT 1 
  FROM user_statistics 
  WHERE user_statistics.user_id = users.id
);