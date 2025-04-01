/*
  # Fix RLS Policies and User Statistics

  1. Changes
    - Add policy for user statistics initialization
    - Fix user creation policy to handle statistics
    - Add trigger for automatic statistics creation
    - Add development environment handling

  2. Security
    - Maintain RLS on all tables
    - Allow proper access for authenticated users
*/

-- Add policy for user statistics initialization
CREATE POLICY "Users can initialize their own statistics"
  ON user_statistics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000')
  );

-- Add policy for updating user statistics
CREATE POLICY "Users can update their own statistics"
  ON user_statistics
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (is_development() AND user_id = '00000000-0000-0000-0000-000000000000')
  );

-- Function to handle user creation with statistics
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user statistics record
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
    NEW.id,
    0, 0, 0, 0, 0, 0, 0, 0
  ) ON CONFLICT (user_id) DO NOTHING;

  -- Initialize presence
  INSERT INTO real_time_presence (
    user_id,
    status,
    user_role,
    last_seen
  ) VALUES (
    NEW.id,
    'online',
    NEW.role,
    now()
  ) ON CONFLICT (user_id) DO UPDATE SET
    status = 'online',
    user_role = NEW.role,
    last_seen = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_new_user_trigger ON users;

-- Create trigger for new user handling
CREATE TRIGGER handle_new_user_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to ensure test user has statistics
CREATE OR REPLACE FUNCTION ensure_test_user_statistics()
RETURNS void AS $$
BEGIN
  -- Create statistics for test user if they don't exist
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
    '00000000-0000-0000-0000-000000000000',
    0, 0, 0, 0, 0, 0, 0, 0
  ) ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Ensure test user has statistics
SELECT ensure_test_user_statistics();