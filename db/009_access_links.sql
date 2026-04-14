CREATE TABLE IF NOT EXISTS access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'link' CHECK (type IN ('link', 'staging', 'production', 'admin', 'docs', 'api')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_links_ticket_id ON access_links(ticket_id);
