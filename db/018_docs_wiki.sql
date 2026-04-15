-- Documentation spaces (like Confluence spaces)
CREATE TABLE IF NOT EXISTS doc_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folders and subfolders (tree structure)
CREATE TABLE IF NOT EXISTS doc_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES doc_spaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES doc_folders(id) ON DELETE CASCADE, -- null = root
  name TEXT NOT NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages/documents (the actual content)
CREATE TABLE IF NOT EXISTS doc_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES doc_spaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES doc_folders(id) ON DELETE SET NULL, -- null = space root
  title TEXT NOT NULL,
  content TEXT DEFAULT '', -- HTML content from rich text editor
  created_by UUID REFERENCES members(id),
  updated_by UUID REFERENCES members(id),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_spaces_workspace ON doc_spaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_space ON doc_folders(space_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent ON doc_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_pages_space ON doc_pages(space_id);
CREATE INDEX IF NOT EXISTS idx_doc_pages_folder ON doc_pages(folder_id);

-- Seed a default space
INSERT INTO doc_spaces (workspace_id, name, description, icon)
SELECT id, 'Base de Conhecimento', 'Documentação geral da organização', '📚'
FROM workspaces WHERE slug = 'bahcompany'
ON CONFLICT DO NOTHING;
