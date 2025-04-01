/*
  # Update flags table schema

  1. Changes
    - Add type and severity columns to flags table
    - Update existing flags table structure
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Add new columns to flags table
DO $$ 
BEGIN
  -- Add type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flags' AND column_name = 'type'
  ) THEN
    ALTER TABLE flags 
      ADD COLUMN type text CHECK (type IN ('inappropriate', 'dangerous', 'scam'));
  END IF;

  -- Add severity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flags' AND column_name = 'severity'
  ) THEN
    ALTER TABLE flags 
      ADD COLUMN severity text CHECK (severity IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_flags_session ON flags(session_id);
CREATE INDEX IF NOT EXISTS idx_flags_uplifter ON flags(uplifter_id);
CREATE INDEX IF NOT EXISTS idx_flags_status ON flags(status);
CREATE INDEX IF NOT EXISTS idx_flags_type ON flags(type);
CREATE INDEX IF NOT EXISTS idx_flags_severity ON flags(severity);

-- Update existing policies to include new columns
DROP POLICY IF EXISTS "Heroes can create flags" ON flags;
DROP POLICY IF EXISTS "Users can view their own flags" ON flags;

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