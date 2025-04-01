-- Modify emotional_tracking table to use decimal scores
ALTER TABLE emotional_tracking 
  ALTER COLUMN score TYPE decimal(3,1) USING score::decimal(3,1);

-- Update the check constraint for the new decimal range
ALTER TABLE emotional_tracking 
  DROP CONSTRAINT IF EXISTS emotional_tracking_score_check,
  ADD CONSTRAINT emotional_tracking_score_check 
    CHECK (score >= 0.0 AND score <= 10.0);

-- Add index for score range queries
CREATE INDEX IF NOT EXISTS idx_emotional_tracking_score 
  ON emotional_tracking(score);

-- Update example data with decimal scores
UPDATE emotional_tracking 
SET score = ROUND(score::decimal, 1)
WHERE score IS NOT NULL;