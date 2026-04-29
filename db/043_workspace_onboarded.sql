-- ============================================================================
-- Migration 043: Workspace onboarded flag
-- ----------------------------------------------------------------------------
-- Marca quando o workspace concluiu o wizard de onboarding (3 passos:
-- primeiro projeto, convidar pessoas, pronto). Usado pelo Dashboard para
-- decidir se redireciona o owner para /onboarding na primeira vez.
--
-- Idempotente: pode ser rodada múltiplas vezes sem efeito colateral.
-- ============================================================================

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
