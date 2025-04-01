/*
  # Add INSERT policy for users table
  
  1. Changes
    - Add new policy to allow users to insert their own data
    
  2. Security
    - Policy ensures users can only insert rows where auth.uid matches id
*/

-- Drop the policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

-- Create the INSERT policy
CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);