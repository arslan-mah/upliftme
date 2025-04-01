/*
  # Add payment tracking and flags system

  1. New Columns
    - Add payment tracking columns to sessions table
    - Add rating statistics columns to users table

  2. New Tables
    - flags
      - For reporting inappropriate behavior
      - Tracks uplifter flags with reasons
      - Includes status tracking

  3. Security
    - Enable RLS on flags table
    - Proper policies for flag creation and viewing
    - Secure access to payment information
*/

-- Add payment and room columns to sessions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'payment_intent_id'
  ) THEN
    ALTER TABLE sessions 
      ADD COLUMN payment_intent_id text,
      ADD COLUMN amount_paid integer,
      ADD COLUMN uplifter_earnings integer,
      ADD COLUMN platform_fee integer,
      ADD COLUMN room_url text;
  END IF;
END $$;

-- Add rating columns to users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'rating_sum'
  ) THEN
    ALTER TABLE users 
      ADD COLUMN rating_sum integer DEFAULT 0,
      ADD COLUMN rating_count integer DEFAULT 0;
  END IF;
END $$;

-- Create flags table
CREATE TABLE IF NOT EXISTS flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions NOT NULL,
  uplifter_id uuid REFERENCES users NOT NULL,
  reason text NOT NULL,
  status text CHECK (status IN ('pending', 'reviewed', 'resolved')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Heroes can create flags" ON flags;
DROP POLICY IF EXISTS "Users can view their own flags" ON flags;

-- Policies for flags
CREATE POLICY "Heroes can create flags"
  ON flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = flags.session_id
      AND sessions.hero_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own flags"
  ON flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = flags.session_id
      AND (sessions.hero_id = auth.uid() OR sessions.uplifter_id = auth.uid())
    )
  );

-- Function to update uplifter stats
CREATE OR REPLACE FUNCTION update_uplifter_stats()
RETURNS trigger AS $$
BEGIN
  IF NEW.rating IS NOT NULL THEN
    UPDATE users
    SET 
      rating_sum = COALESCE(rating_sum, 0) + NEW.rating,
      rating_count = COALESCE(rating_count, 0) + 1
    WHERE id = NEW.uplifter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating uplifter stats
DROP TRIGGER IF EXISTS update_uplifter_stats_trigger ON sessions;
CREATE TRIGGER update_uplifter_stats_trigger
  AFTER UPDATE OF rating ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_uplifter_stats();