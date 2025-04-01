/*
  # Initial Schema Setup for UpliftMe

  1. New Tables
    - users
      - id (uuid, primary key)
      - email (text, unique)
      - role (text)
      - username (text)
      - avatar_url (text)
      - bio (text)
      - created_at (timestamp)
      - subscription_tier (text)
      - subscription_status (text)
      - sessions_remaining (integer)
      
    - sessions
      - id (uuid, primary key)
      - hero_id (uuid, references users)
      - uplifter_id (uuid, references users)
      - status (text)
      - started_at (timestamp)
      - ended_at (timestamp)
      - rating (integer)
      - feedback (text)
      
    - transactions
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - amount (integer)
      - type (text)
      - status (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Users Table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text CHECK (role IN ('hero', 'uplifter')) NOT NULL,
  username text UNIQUE,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  subscription_tier text DEFAULT 'free',
  subscription_status text DEFAULT 'inactive',
  sessions_remaining integer DEFAULT 0
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Sessions Table
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id uuid REFERENCES users NOT NULL,
  uplifter_id uuid REFERENCES users NOT NULL,
  status text CHECK (status IN ('pending', 'active', 'completed', 'aborted')) NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = hero_id OR auth.uid() = uplifter_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = hero_id OR auth.uid() = uplifter_id);

-- Transactions Table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  amount integer NOT NULL,
  type text CHECK (type IN ('subscription', 'session_purchase', 'payout')) NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'failed')) NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION get_top_uplifters(limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  rating_avg numeric,
  sessions_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.avatar_url,
    COALESCE(AVG(s.rating), 0) as rating_avg,
    COUNT(s.id) as sessions_count
  FROM users u
  LEFT JOIN sessions s ON u.id = s.uplifter_id
  WHERE u.role = 'uplifter'
  GROUP BY u.id, u.username, u.avatar_url
  ORDER BY rating_avg DESC, sessions_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;