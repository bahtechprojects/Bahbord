-- Update tickets_full to include project and board info
DROP VIEW IF EXISTS tickets_full;
CREATE VIEW tickets_full AS
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
  t.project_id,
  t.board_id,
  t.client_id,
  -- Ticket key
  w.prefix || '-' || LPAD(t.sequence_number::text, 3, '0') AS ticket_key,
  -- Type
  tt.id AS type_id, tt.name AS type_name, tt.icon AS type_icon, tt.color AS type_color,
  -- Status
  s.id AS status_id, s.name AS status_name, s.color AS status_color, s.position AS status_position, s.is_done,
  -- Service
  sv.id AS service_id, sv.name AS service_name, sv.color AS service_color,
  -- Category
  cat.id AS category_id, cat.name AS category_name,
  -- Assignee
  ma.id AS assignee_id, ma.display_name AS assignee_name, ma.email AS assignee_email,
  -- Reporter
  mr.id AS reporter_id, mr.display_name AS reporter_name,
  -- Sprint
  sp.id AS sprint_id_ref, sp.name AS sprint_name,
  -- Client
  cl.id AS client_id_ref, cl.name AS client_name, cl.color AS client_color,
  -- Project
  p.name AS project_name, p.prefix AS project_prefix,
  -- Board
  b.name AS board_name,
  -- Counts
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
LEFT JOIN members ma ON ma.id = t.assignee_id
LEFT JOIN members mr ON mr.id = t.reporter_id
LEFT JOIN sprints sp ON sp.id = t.sprint_id
LEFT JOIN clients cl ON cl.id = t.client_id
LEFT JOIN projects p ON p.id = t.project_id
LEFT JOIN boards b ON b.id = t.board_id;
