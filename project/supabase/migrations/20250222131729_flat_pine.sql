-- Add legal acceptance columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS legal_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legal_version text;

-- Create index for legal acceptance
CREATE INDEX IF NOT EXISTS idx_users_legal_acceptance 
  ON users(legal_accepted_at, legal_version);

-- Update example user with legal acceptance
UPDATE users 
SET 
  legal_accepted_at = now(),
  legal_version = '1.0'
WHERE id = '00000000-0000-0000-0000-000000000000';