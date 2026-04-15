// MongoDB document interfaces with UUID4 IDs

export interface AccessLogDoc {
  _id: string; // uuid4
  workspace_id: string;
  member_id: string;
  member_name: string;
  action: string; // 'login', 'logout', 'page_view', 'api_call', 'ticket_view', etc.
  resource: string; // '/board', '/ticket/abc', '/api/tickets', etc.
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface AuditTrailDoc {
  _id: string; // uuid4
  workspace_id: string;
  project_id?: string;
  member_id: string;
  member_name: string;
  entity_type: string; // 'ticket', 'project', 'board', 'member', 'settings', etc.
  entity_id: string;
  entity_name?: string;
  action: string; // 'created', 'updated', 'deleted', 'archived', 'status_changed', etc.
  changes?: {
    field: string;
    old_value: unknown;
    new_value: unknown;
  }[];
  commit_hash?: string;
  created_at: Date;
}

export interface TimeLogDoc {
  _id: string; // uuid4
  workspace_id: string;
  ticket_id: string;
  ticket_key?: string;
  member_id: string;
  member_name: string;
  started_at: Date;
  ended_at?: Date;
  duration_minutes: number;
  description?: string;
  is_billable: boolean;
  is_running: boolean;
  synced_to?: string; // 'clockify', etc.
  external_id?: string;
  created_at: Date;
}
