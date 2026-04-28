-- ============================================================================
-- Migration 040: Audit Log
-- ----------------------------------------------------------------------------
-- Sistema de auditoria pra eventos sensíveis: mudança de role,
-- criação/exclusão de membros, projetos, automations, share-links, integrações.
--
-- Tabela nova (não reusa `changelog` da migration 012, que tem schema voltado
-- pra commits de git e não tem campos de IP/user agent/actor explícito).
-- Idempotente: pode ser rodada múltiplas vezes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES members(id) ON DELETE SET NULL,
  action TEXT NOT NULL,        -- 'member.role_changed', 'project.created', etc.
  entity_type TEXT NOT NULL,   -- 'member', 'project', 'automation', 'share_link', etc.
  entity_id UUID,
  changes JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_workspace_time
  ON audit_log(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON audit_log(actor_id);
