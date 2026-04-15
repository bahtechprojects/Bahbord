-- 023: Ensure time_entries has all required columns
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT false;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate old data if exists
UPDATE time_entries
SET
  duration_minutes = COALESCE(duration_minutes, minutes),
  started_at = COALESCE(started_at, logged_at),
  is_running = COALESCE(is_running, false)
WHERE duration_minutes IS NULL OR started_at IS NULL;
