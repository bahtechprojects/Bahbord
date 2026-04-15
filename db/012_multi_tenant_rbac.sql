-- ========== PROJECTS ==========
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);

-- ========== BOARDS ==========
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'kanban' CHECK (type IN ('kanban', 'scrum', 'simple')),
  filter_query TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_project_id ON boards(project_id);

-- ========== RBAC ROLES ==========
CREATE TABLE IF NOT EXISTS org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, member_id)
);

CREATE TABLE IF NOT EXISTS project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, member_id)
);

CREATE TABLE IF NOT EXISTS board_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, member_id)
);

-- ========== LINK TICKETS TO PROJECTS ==========
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id);

CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_board_id ON tickets(board_id);

-- ========== PROJECT TEMPLATES ==========
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO project_templates (name, description, config, is_system) VALUES
('Kanban Simples', 'Board kanban com colunas básicas', '{"statuses":["Não Iniciado","Em Progresso","Concluído"],"types":["Tarefa","Bug"]}', true),
('Scrum', 'Sprints, histórias e bugs', '{"statuses":["Não Iniciado","Aguardando","Em Progresso","Em Revisão","Concluído"],"types":["História","Tarefa","Bug","Epic"]}', true),
('Suporte', 'Atendimento ao cliente', '{"statuses":["Aberto","Em Atendimento","Aguardando Cliente","Resolvido"],"types":["Chamado","Bug","Melhoria"]}', true);

-- ========== CHANGELOG / AUDIT LOG ==========
CREATE TABLE IF NOT EXISTS changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  commit_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_workspace_id ON changelog(workspace_id);
CREATE INDEX IF NOT EXISTS idx_changelog_project_id ON changelog(project_id);
CREATE INDEX IF NOT EXISTS idx_changelog_created_at ON changelog(created_at DESC);

-- Seed: create default project from existing workspace data
INSERT INTO projects (workspace_id, name, prefix, description, color)
SELECT id, name, prefix, description, '#3b82f6' FROM workspaces LIMIT 1
ON CONFLICT DO NOTHING;

-- Create default board for existing project
INSERT INTO boards (project_id, name, type, is_default)
SELECT p.id, 'Board Principal', 'kanban', true
FROM projects p
LIMIT 1
ON CONFLICT DO NOTHING;
