-- ============================================================================
-- Migration 042: Recurring Tickets
-- ----------------------------------------------------------------------------
-- Tickets recorrentes (cron-based) pra rotinas: backup, planning, reuniões.
-- Um cron job externo (Vercel Cron ou cron-job.org) chama
-- POST /api/cron/recurring-tickets, que percorre is_active=true AND
-- next_run_at <= NOW(), cria os tickets e recalcula next_run_at.
--
-- Idempotente: pode ser rodada múltiplas vezes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title_template TEXT NOT NULL, -- pode ter {{date}} {{week}} {{month}}
  description_html TEXT,
  ticket_type_id UUID REFERENCES ticket_types(id),
  service_id UUID REFERENCES services(id),
  assignee_id UUID REFERENCES members(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium',
  cron_expression TEXT NOT NULL, -- '0 9 * * 1' = toda seg 9h
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES members(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_tickets(is_active, next_run_at);
