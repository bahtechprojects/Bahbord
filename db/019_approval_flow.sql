-- Fila de aprovação para criação de projetos e acesso
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('project_creation', 'project_access', 'board_access', 'org_access')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Dados do pedido (JSON flexível)
  request_data JSONB NOT NULL DEFAULT '{}',
  -- Aprovação/rejeição
  reviewer_id UUID REFERENCES members(id),
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_workspace ON approval_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requester ON approval_requests(requester_id);

-- Adicionar campo de status de aprovação aos membros
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Membros existentes são aprovados automaticamente
UPDATE members SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;
