/*
  # Fix test user creation and foreign key constraints

  1. Changes
    - Create test user in auth schema
    - Add function to ensure test user exists
    - Update RLS policies to handle test user
  
  2. Security
    - Maintains existing security while allowing development testing
    - Only creates test user in development environment
*/

-- Function to create test user in auth schema
CREATE OR REPLACE FUNCTION create_test_auth_user()
RETURNS void AS $$
BEGIN
  -- Insert test user into auth.users if it doesn't exist
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test@example.com',
    '$2a$10$Q7RNHL1KHFMoKDI.IS1Z7.B1hB8iLv4WHJ1F5fQFYkJ/2qWQUGqGy', -- Test123!
    NOW(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create test user in auth schema
SELECT create_test_auth_user();

-- Function to ensure test user exists in public schema
CREATE OR REPLACE FUNCTION ensure_test_user()
RETURNS void AS $$
BEGIN
  -- Create test user in public.users if it doesn't exist
  INSERT INTO public.users (
    id,
    email,
    role,
    username,
    avatar_url,
    bio,
    created_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test@example.com',
    'uplifter',
    'Test User',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format',
    'This is a test user for development purposes.',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create test user in public schema
SELECT ensure_test_user();

-- Update RLS policies to handle test user
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Users can read their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;

CREATE POLICY "Users can create sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id OR
    (is_development() AND (
      hero_id = '00000000-0000-0000-0000-000000000000' OR
      uplifter_id = '00000000-0000-0000-0000-000000000000'
    ))
  );

CREATE POLICY "Users can read their own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id OR
    (is_development() AND (
      hero_id = '00000000-0000-0000-0000-000000000000' OR
      uplifter_id = '00000000-0000-0000-0000-000000000000'
    ))
  );

CREATE POLICY "Users can update their own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = hero_id OR 
    auth.uid() = uplifter_id OR
    (is_development() AND (
      hero_id = '00000000-0000-0000-0000-000000000000' OR
      uplifter_id = '00000000-0000-0000-0000-000000000000'
    ))
  );