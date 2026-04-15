-- Permission groups/categories
CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- Permission catalog
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- e.g. 'fetch:customers', 'write:tickets', 'delete:subscriptions'
  display_name TEXT NOT NULL, -- e.g. 'Exibir Clientes', 'Criar Tickets'
  group_id UUID REFERENCES permission_groups(id),
  scope TEXT NOT NULL DEFAULT 'both' CHECK (scope IN ('users', 'api_keys', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, key)
);

-- Role-permission assignments (which roles have which permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL, -- 'owner', 'admin', 'member', 'viewer', or custom role name
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_name, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_workspace ON permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_permissions_group ON permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);

-- Seed default permission groups
INSERT INTO permission_groups (workspace_id, name)
SELECT w.id, g FROM workspaces w,
  unnest(ARRAY['Admin', 'Clientes', 'Configurações', 'Dashboard', 'Tickets', 'Integrações', 'Webhooks', 'Timesheet']) AS g
WHERE w.slug = 'bahcompany'
ON CONFLICT DO NOTHING;

-- Seed default permissions
INSERT INTO permissions (workspace_id, key, display_name, group_id, scope)
SELECT w.id, p.key, p.display_name, pg.id, p.scope
FROM workspaces w
CROSS JOIN LATERAL (VALUES
    ('admin:all', 'Acesso Total (Superadmin)', 'Admin', 'both'),
    ('read:customers', 'Exibir Clientes', 'Clientes', 'users'),
    ('read:customers_analytics', 'Análise de Clientes', 'Clientes', 'users'),
    ('write:customers', 'Criar/Editar Clientes', 'Clientes', 'users'),
    ('read:tickets', 'Visualizar Tickets', 'Tickets', 'both'),
    ('write:tickets', 'Criar/Editar Tickets', 'Tickets', 'both'),
    ('delete:tickets', 'Remover Tickets', 'Tickets', 'users'),
    ('read:dashboard', 'Visualizar Dashboard', 'Dashboard', 'users'),
    ('read:settings', 'Visualizar Configurações', 'Configurações', 'users'),
    ('write:settings', 'Editar Configurações', 'Configurações', 'users'),
    ('read:timesheet', 'Visualizar Timesheet', 'Timesheet', 'both'),
    ('write:timesheet', 'Registrar Tempo', 'Timesheet', 'both'),
    ('manage:webhooks', 'Gerenciar Webhooks', 'Webhooks', 'both'),
    ('manage:integrations', 'Gerenciar Integrações', 'Integrações', 'users'),
    ('manage:api_keys', 'Gerenciar API Keys', 'Configurações', 'users')
) AS p(key, display_name, group_name, scope)
JOIN permission_groups pg ON pg.workspace_id = w.id AND pg.name = p.group_name
WHERE w.slug = 'bahcompany'
ON CONFLICT DO NOTHING;

-- Assign all permissions to 'admin' role
INSERT INTO role_permissions (role_name, permission_id, workspace_id)
SELECT 'admin', p.id, p.workspace_id
FROM permissions p
ON CONFLICT DO NOTHING;
