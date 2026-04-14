-- 010: Tabela de clientes + client_id em tickets

-- ========== CLIENTS ==========
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add client_id to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON clients(workspace_id);

-- Seed some clients
INSERT INTO clients (workspace_id, name, color)
SELECT id, 'Bah!Company', '#3b82f6' FROM workspaces WHERE slug = 'bahcompany';
INSERT INTO clients (workspace_id, name, color)
SELECT id, 'Lovatto Fit', '#8b5cf6' FROM workspaces WHERE slug = 'bahcompany';
INSERT INTO clients (workspace_id, name, color)
SELECT id, 'Equinox', '#eab308' FROM workspaces WHERE slug = 'bahcompany';

-- ========== UPDATE VIEW tickets_full ==========
DROP VIEW IF EXISTS tickets_full CASCADE;
CREATE OR REPLACE VIEW tickets_full AS
SELECT
  t.id,
  t.workspace_id,
  t.title,
  t.description,
  t.priority,
  t.due_date,
  t.sequence_number,
  t.created_at,
  t.updated_at,
  t.completed_at,
  t.is_archived,
  t.parent_id,
  t.sprint_id,
  -- Ticket key formatado
  w.prefix || '-' || LPAD(t.sequence_number::text, 3, '0') AS ticket_key,
  -- Tipo
  tt.id AS type_id,
  tt.name AS type_name,
  tt.icon AS type_icon,
  tt.color AS type_color,
  -- Status
  s.id AS status_id,
  s.name AS status_name,
  s.color AS status_color,
  s.position AS status_position,
  s.is_done,
  -- Servico
  sv.id AS service_id,
  sv.name AS service_name,
  sv.color AS service_color,
  -- Categoria
  cat.id AS category_id,
  cat.name AS category_name,
  -- Cliente
  cl.id AS client_id,
  cl.name AS client_name,
  cl.color AS client_color,
  -- Assignee
  ma.id AS assignee_id,
  ma.display_name AS assignee_name,
  ma.email AS assignee_email,
  -- Reporter
  mr.id AS reporter_id,
  mr.display_name AS reporter_name,
  -- Sprint
  sp.id AS sprint_id_ref,
  sp.name AS sprint_name,
  -- Contadores
  (SELECT COUNT(*) FROM subtasks st WHERE st.ticket_id = t.id) AS subtask_count,
  (SELECT COUNT(*) FROM subtasks st WHERE st.ticket_id = t.id AND st.is_done = true) AS subtask_done_count,
  (SELECT COUNT(*) FROM comments c WHERE c.ticket_id = t.id) AS comment_count,
  (SELECT COUNT(*) FROM attachments a WHERE a.ticket_id = t.id) AS attachment_count
FROM tickets t
JOIN workspaces w ON w.id = t.workspace_id
LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
LEFT JOIN statuses s ON s.id = t.status_id
LEFT JOIN services sv ON sv.id = t.service_id
LEFT JOIN categories cat ON cat.id = t.category_id
LEFT JOIN clients cl ON cl.id = t.client_id
LEFT JOIN members ma ON ma.id = t.assignee_id
LEFT JOIN members mr ON mr.id = t.reporter_id
LEFT JOIN sprints sp ON sp.id = t.sprint_id;
