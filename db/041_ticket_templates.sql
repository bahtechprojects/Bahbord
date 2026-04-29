-- ============================================================================
-- Migration 041: Ticket Templates
-- ----------------------------------------------------------------------------
-- Permite admin criar templates reutilizáveis (Bug template, Feature template)
-- com título base, descrição (HTML do TipTap), tipo, prioridade, serviço,
-- categoria e checklist de subtasks. No CreateTicketModal o usuário escolhe
-- um template e os campos são pré-preenchidos.
--
-- Idempotente: pode ser rodada múltiplas vezes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  title_template TEXT,
  description_html TEXT,
  priority TEXT,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  subtasks JSONB DEFAULT '[]', -- array de strings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES members(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_workspace ON ticket_templates(workspace_id);
