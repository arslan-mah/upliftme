/*
  # Fix user preferences and matching system

  1. Changes
    - Add default preferences trigger
    - Fix user preferences constraints
    - Add indexes for better performance
    - Update matching functions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_default_preferences();

-- Create function to handle default preferences
CREATE OR REPLACE FUNCTION create_default_preferences()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_preferences (
    user_id,
    interests,
    preferred_times,
    languages
  ) VALUES (
    NEW.id,
    ARRAY['motivation', 'personal-growth'],
    '{"anytime": true}'::jsonb,
    ARRAY['en']
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create preferences
DROP TRIGGER IF EXISTS create_default_preferences_trigger ON users;
CREATE TRIGGER create_default_preferences_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_preferences();

-- Add unique constraint to prevent duplicate preferences
ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_user_id_key,
  ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_interests ON user_preferences USING gin (interests);
CREATE INDEX IF NOT EXISTS idx_user_preferences_languages ON user_preferences USING gin (languages);

-- Update find_best_match function to handle missing preferences
CREATE OR REPLACE FUNCTION find_best_match(user_id uuid, role text)
RETURNS TABLE (
  matched_user_id uuid,
  match_score float,
  username text,
  avatar_url text,
  bio text
) AS $$
BEGIN
  -- Ensure user has preferences
  INSERT INTO user_preferences (user_id, interests, preferred_times, languages)
  VALUES (
    user_id,
    ARRAY['motivation', 'personal-growth'],
    '{"anytime": true}'::jsonb,
    ARRAY['en']
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF role = 'hero' THEN
    RETURN QUERY
    SELECT 
      u.id as matched_user_id,
      COALESCE(ms.score, calculate_match_score(user_id, u.id)) as match_score,
      u.username,
      u.avatar_url,
      u.bio
    FROM users u
    LEFT JOIN matching_scores ms ON ms.hero_id = user_id AND ms.uplifter_id = u.id
    WHERE u.role = 'uplifter'
      AND u.id != user_id
      AND NOT EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.hero_id = user_id 
        AND s.uplifter_id = u.id
        AND s.status = 'active'
      )
    ORDER BY match_score DESC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT 
      u.id as matched_user_id,
      COALESCE(ms.score, calculate_match_score(u.id, user_id)) as match_score,
      u.username,
      u.avatar_url,
      u.bio
    FROM users u
    LEFT JOIN matching_scores ms ON ms.hero_id = u.id AND ms.uplifter_id = user_id
    WHERE u.role = 'hero'
      AND u.id != user_id
      AND NOT EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.uplifter_id = user_id 
        AND s.hero_id = u.id
        AND s.status = 'active'
      )
    ORDER BY match_score DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;