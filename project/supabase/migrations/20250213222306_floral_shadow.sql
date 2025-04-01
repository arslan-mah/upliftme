/*
  # Fix matching system

  1. Changes
    - Drop existing functions before recreating them
    - Fix parameter names in matching functions
    - Improve matching logic with better error handling
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS find_best_match(uuid, text);
DROP FUNCTION IF EXISTS calculate_match_score(uuid, uuid);

-- Create calculate_match_score function
CREATE OR REPLACE FUNCTION calculate_match_score(hero_id uuid, uplifter_id uuid)
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
  SELECT * INTO hero_prefs FROM user_preferences WHERE user_id = hero_id;
  SELECT * INTO uplifter_prefs FROM user_preferences WHERE user_id = uplifter_id;
  
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

-- Create find_best_match function
CREATE OR REPLACE FUNCTION find_best_match(search_user_id uuid, search_role text)
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
    search_user_id,
    ARRAY['motivation', 'personal-growth'],
    '{"anytime": true}'::jsonb,
    ARRAY['en']
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF search_role = 'hero' THEN
    RETURN QUERY
    SELECT 
      u.id as matched_user_id,
      COALESCE(ms.score, calculate_match_score(search_user_id, u.id)) as match_score,
      u.username,
      u.avatar_url,
      u.bio
    FROM users u
    LEFT JOIN matching_scores ms ON ms.hero_id = search_user_id AND ms.uplifter_id = u.id
    WHERE u.role = 'uplifter'
      AND u.id != search_user_id
      AND NOT EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.hero_id = search_user_id 
        AND s.uplifter_id = u.id
        AND s.status = 'active'
      )
    ORDER BY match_score DESC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT 
      u.id as matched_user_id,
      COALESCE(ms.score, calculate_match_score(u.id, search_user_id)) as match_score,
      u.username,
      u.avatar_url,
      u.bio
    FROM users u
    LEFT JOIN matching_scores ms ON ms.hero_id = u.id AND ms.uplifter_id = search_user_id
    WHERE u.role = 'hero'
      AND u.id != search_user_id
      AND NOT EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.uplifter_id = search_user_id 
        AND s.hero_id = u.id
        AND s.status = 'active'
      )
    ORDER BY match_score DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;