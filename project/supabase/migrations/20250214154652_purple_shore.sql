/*
  # Fix avatar storage

  1. Changes
    - Create avatars storage bucket
    - Add storage policies for avatar uploads
    - Add RLS policies for bucket access

  2. Security
    - Enable RLS on storage bucket
    - Add policies for authenticated users to manage their own avatars
    - Restrict file types to images only
*/

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576, -- 1MB
  ARRAY['image/jpeg', 'image/png', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for avatar uploads
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR
     is_development())
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR
     is_development())
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR
     is_development())
  );