-- Create example session data
DO $$ 
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  example_session_id uuid;
BEGIN
  -- Create example session
  INSERT INTO sessions (
    id,
    hero_id,
    uplifter_id,
    status,
    started_at,
    ended_at,
    rating,
    message,
    note,
    amount_paid,
    uplifter_earnings,
    platform_fee
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    test_user_id,
    'completed',
    now() - interval '1 day',
    now() - interval '1 day' + interval '7 minutes',
    5,
    'Great session! Really helped me feel better.',
    'Remember to practice daily gratitude',
    110,
    100,
    10
  )
  RETURNING id INTO example_session_id;

  -- Add emotional tracking data
  INSERT INTO emotional_tracking (
    session_id,
    user_id,
    score,
    type,
    created_at
  ) VALUES 
  (
    example_session_id,
    test_user_id,
    3,
    'pre_session',
    now() - interval '1 day'
  ),
  (
    example_session_id,
    test_user_id,
    8,
    'post_session',
    now() - interval '1 day' + interval '7 minutes'
  );
END $$;