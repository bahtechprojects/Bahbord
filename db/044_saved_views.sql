-- 044: Saved views — usuário salva combinação de filtros como atalho na sidebar
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT, -- emoji ou nome lucide
  scope TEXT NOT NULL DEFAULT 'board', -- 'board' | 'list' | 'backlog'
  filters JSONB DEFAULT '{}', -- { search?, status?, assignee?, priority?, type?, project_id?, board_id? }
  position INT DEFAULT 0,
  is_shared BOOLEAN DEFAULT false, -- visível pra todos da org se admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_views_member ON saved_views(member_id, position);
CREATE INDEX IF NOT EXISTS idx_saved_views_workspace ON saved_views(workspace_id, is_shared);
