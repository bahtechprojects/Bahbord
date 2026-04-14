-- 004: Indexes para performance em queries frequentes

-- ========== TICKETS ==========
CREATE INDEX IF NOT EXISTS idx_tickets_status_id ON tickets(status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sprint_id ON tickets(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tickets_service_id ON tickets(service_id);
CREATE INDEX IF NOT EXISTS idx_tickets_workspace_id ON tickets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_archived ON tickets(is_archived);

-- ========== SUBTASKS ==========
CREATE INDEX IF NOT EXISTS idx_subtasks_ticket_id ON subtasks(ticket_id);

-- ========== COMMENTS ==========
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);

-- ========== TIME ENTRIES ==========
CREATE INDEX IF NOT EXISTS idx_time_entries_ticket_id ON time_entries(ticket_id);

-- ========== ACTIVITY LOG ==========
CREATE INDEX IF NOT EXISTS idx_activity_log_ticket_id ON activity_log(ticket_id);

-- ========== ATTACHMENTS ==========
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id);

-- ========== TICKET LINKS ==========
CREATE INDEX IF NOT EXISTS idx_ticket_links_source_ticket_id ON ticket_links(source_ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_links_target_ticket_id ON ticket_links(target_ticket_id);

-- ========== NOTIFICATIONS ==========
CREATE INDEX IF NOT EXISTS idx_notifications_member_id ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ========== SPRINTS ==========
CREATE INDEX IF NOT EXISTS idx_sprints_workspace_id ON sprints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sprints_is_active ON sprints(is_active);
