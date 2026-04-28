-- 039: Recalcula duration_minutes pra entries que ficaram com 0 (truncamento INT)
-- Apenas pra entries finalizadas (is_running=false, ended_at IS NOT NULL)

UPDATE time_entries
SET duration_minutes = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60))::int
WHERE is_running = false
  AND ended_at IS NOT NULL
  AND started_at IS NOT NULL
  AND (duration_minutes IS NULL OR duration_minutes = 0)
  AND ended_at > started_at;
