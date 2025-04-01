/*
  # Fix Sessions Table RLS Policies

  1. Changes
    - Add INSERT policy for sessions table
    - Update existing SELECT and UPDATE policies
    - Add policies for completed sessions

  2. Security
    - Users can create sessions when they are either the hero or uplifter
    - Users can only update their own sessions
    - Users can only view sessions they are part of
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;

-- Create new policies
CREATE POLICY "Users can create sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id
  );

CREATE POLICY "Users can read their own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id
  );

CREATE POLICY "Users can update their own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id
  )
  WITH CHECK (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_users 
  ON sessions(hero_id, uplifter_id);