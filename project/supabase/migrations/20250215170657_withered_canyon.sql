/*
  # Performance Optimizations and Statistics Functions

  1. Indexes
    - Add indexes for frequently queried columns
    - Optimize query performance for statistics

  2. Functions
    - Initialize user statistics
    - Update rating statistics
    - Update flag statistics

  3. Triggers
    - Automatic statistics creation for new users
    - Rating updates
    - Flag tracking
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_completed 
  ON sessions(status) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_real_time_presence_status 
  ON real_time_presence(status, user_role);

-- Create statistics indexes after verifying table exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_statistics'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_statistics_total_sessions 
      ON user_statistics(total_sessions);
    
    CREATE INDEX IF NOT EXISTS idx_user_statistics_average_rating 
      ON user_statistics(average_rating);
    
    CREATE INDEX IF NOT EXISTS idx_user_statistics_total_earnings 
      ON user_statistics(total_earnings);
  END IF;
END $$;

-- Function to initialize user statistics
CREATE OR REPLACE FUNCTION initialize_user_statistics()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_statistics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create statistics record for new users
DROP TRIGGER IF EXISTS create_user_statistics ON users;
CREATE TRIGGER create_user_statistics
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_statistics();

-- Function to update rating statistics
CREATE OR REPLACE FUNCTION update_rating_statistics()
RETURNS trigger AS $$
BEGIN
  UPDATE user_statistics
  SET 
    total_ratings = total_ratings + 1,
    average_rating = (
      (average_rating * total_ratings + NEW.rating) / (total_ratings + 1)
    )
  WHERE user_id = NEW.uplifter_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating rating statistics
DROP TRIGGER IF EXISTS update_ratings ON sessions;
CREATE TRIGGER update_ratings
  AFTER UPDATE OF rating ON sessions
  FOR EACH ROW
  WHEN (OLD.rating IS NULL AND NEW.rating IS NOT NULL)
  EXECUTE FUNCTION update_rating_statistics();

-- Function to update flag statistics
CREATE OR REPLACE FUNCTION update_flag_statistics()
RETURNS trigger AS $$
BEGIN
  UPDATE user_statistics
  SET flags_received = flags_received + 1
  WHERE user_id = NEW.uplifter_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating flag statistics
DROP TRIGGER IF EXISTS update_flags ON flags;
CREATE TRIGGER update_flags
  AFTER INSERT ON flags
  FOR EACH ROW
  EXECUTE FUNCTION update_flag_statistics();