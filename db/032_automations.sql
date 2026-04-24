-- 032: Automation/rules engine
-- Stores rules that run on ticket events (created, status_changed, assigned)
-- and execute actions (assign, set priority, add comment, notify member).

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  -- Trigger: event + optional filters
  trigger_event TEXT NOT NULL, -- 'ticket.created', 'ticket.status_changed', 'ticket.assigned'
  trigger_conditions JSONB DEFAULT '{}', -- e.g. { "priority": "urgent", "service_id": "..." }
  -- Action: what to do
  action_type TEXT NOT NULL, -- 'assign_to', 'add_comment', 'set_priority', 'notify_member'
  action_params JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_automations_workspace ON automations(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automations_project ON automations(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automations_event ON automations(trigger_event, is_active);
