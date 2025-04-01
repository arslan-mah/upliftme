/*
  # Add emotional tracking table

  1. New Tables
    - `emotional_tracking`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references users)
      - `score` (integer, 0-10 scale)
      - `type` (text, either 'pre_session' or 'post_session')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on emotional_tracking table
    - Add policies for authenticated users
*/

-- Create emotional tracking table
CREATE TABLE emotional_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions,
  user_id uuid REFERENCES users NOT NULL,
  score integer CHECK (score >= 0 AND score <= 10),
  type text CHECK (type IN ('pre_session', 'post_session')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE emotional_tracking ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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

-- Add indexes for better performance
CREATE INDEX idx_emotional_tracking_session ON emotional_tracking(session_id);
CREATE INDEX idx_emotional_tracking_user ON emotional_tracking(user_id);
CREATE INDEX idx_emotional_tracking_type ON emotional_tracking(type);

-- Add columns to sessions table for feedback
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS note text;