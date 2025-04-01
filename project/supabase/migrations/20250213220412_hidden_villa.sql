/*
  # AI Matching System

  1. New Tables
    - `user_preferences` - Stores user preferences for matching
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `interests` (text array)
      - `preferred_times` (jsonb)
      - `languages` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `matching_scores` - Stores pre-calculated matching scores
      - `hero_id` (uuid)
      - `uplifter_id` (uuid)
      - `score` (float)
      - `last_calculated` (timestamptz)

  2. Functions
    - `find_best_match` - Finds the best match for a user
    - `calculate_match_score` - Calculates compatibility score between users
    - `update_matching_scores` - Background task to update scores

  3. Security
    - Enable RLS on new tables
    - Add policies for data access
*/

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  interests text[] DEFAULT '{}',
  preferred_times jsonb DEFAULT '{}',
  languages text[] DEFAULT ARRAY['en'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Matching Scores Table
CREATE TABLE IF NOT EXISTS matching_scores (
  hero_id uuid REFERENCES users NOT NULL,
  uplifter_id uuid REFERENCES users NOT NULL,
  score float NOT NULL,
  last_calculated timestamptz DEFAULT now(),
  PRIMARY KEY (hero_id, uplifter_id)
);

ALTER TABLE matching_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their matching scores"
  ON matching_scores
  FOR SELECT
  TO authenticated
  USING (auth.uid() = hero_id OR auth.uid() = uplifter_id);

-- Function to calculate match score between two users
CREATE OR REPLACE FUNCTION calculate_match_score(hero uuid, uplifter uuid)
RETURNS float AS $$
DECLARE
  hero_prefs user_preferences;
  uplifter_prefs user_preferences;
  common_interests float;
  time_compatibility float;
  language_match float;
  final_score float;
BEGIN
  -- Get preferences
  SELECT * INTO hero_prefs FROM user_preferences WHERE user_id = hero;
  SELECT * INTO uplifter_prefs FROM user_preferences WHERE user_id = uplifter;
  
  -- Calculate interest overlap
  SELECT COALESCE(
    array_length(ARRAY(
      SELECT UNNEST(hero_prefs.interests)
      INTERSECT
      SELECT UNNEST(uplifter_prefs.interests)
    ), 1)::float / 
    GREATEST(array_length(hero_prefs.interests, 1), array_length(uplifter_prefs.interests, 1))::float,
    0
  ) INTO common_interests;

  -- Calculate time compatibility
  SELECT COALESCE(
    (SELECT count(*) 
     FROM jsonb_object_keys(hero_prefs.preferred_times) t
     WHERE t IN (SELECT jsonb_object_keys(uplifter_prefs.preferred_times)))::float /
    GREATEST(
      jsonb_array_length(hero_prefs.preferred_times::jsonb), 
      jsonb_array_length(uplifter_prefs.preferred_times::jsonb)
    )::float,
    0
  ) INTO time_compatibility;

  -- Calculate language match
  SELECT COALESCE(
    array_length(ARRAY(
      SELECT UNNEST(hero_prefs.languages)
      INTERSECT
      SELECT UNNEST(uplifter_prefs.languages)
    ), 1)::float / 
    GREATEST(array_length(hero_prefs.languages, 1), array_length(uplifter_prefs.languages, 1))::float,
    0
  ) INTO language_match;

  -- Combine scores with weights
  final_score := (common_interests * 0.4) + (time_compatibility * 0.3) + (language_match * 0.3);
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to find best match for a user
CREATE OR REPLACE FUNCTION find_best_match(user_id uuid, role text)
RETURNS TABLE (
  matched_user_id uuid,
  match_score float,
  username text,
  avatar_url text,
  bio text
) AS $$
BEGIN
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