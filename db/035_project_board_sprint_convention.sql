-- Convenção: cada projeto tem 1 board chamado "01 <NOME_PROJETO>" + 1 sprint ativa com o mesmo nome.
-- Esta migration:
--   1) Para cada projeto que tem board "Board Principal" + board "01 <NOME>": migra tickets do "01 <NOME>" para o Principal e deleta o duplicado.
--   2) Renomeia "Board Principal" → "01 <NOME_PROJETO>" e marca como is_default.
--   3) Cria sprint ativa "01 <NOME_PROJETO>" para todo projeto que ainda não tem nenhuma sprint.
-- É idempotente: rodar 2x não causa problema.

BEGIN;

-- 1) Mesclar boards duplicados "01 <NOME>" com "Board Principal"
WITH dup AS (
  SELECT
    old.id AS old_board_id,
    principal.id AS principal_board_id
  FROM boards old
  JOIN projects p ON p.id = old.project_id
  JOIN boards principal ON principal.project_id = p.id AND principal.name = 'Board Principal'
  WHERE old.name = '01 ' || p.name
    AND old.id <> principal.id
)
UPDATE tickets t SET board_id = d.principal_board_id
FROM dup d WHERE t.board_id = d.old_board_id;

DELETE FROM board_roles br
USING (
  SELECT old.id AS old_board_id
  FROM boards old
  JOIN projects p ON p.id = old.project_id
  JOIN boards principal ON principal.project_id = p.id AND principal.name = 'Board Principal'
  WHERE old.name = '01 ' || p.name
    AND old.id <> principal.id
) d
WHERE br.board_id = d.old_board_id;

DELETE FROM boards old
USING projects p, boards principal
WHERE old.project_id = p.id
  AND principal.project_id = p.id
  AND principal.name = 'Board Principal'
  AND old.name = '01 ' || p.name
  AND old.id <> principal.id;

-- 2) Renomear "Board Principal" → "01 <NOME>"
UPDATE boards b
SET name = '01 ' || p.name,
    is_default = true,
    updated_at = NOW()
FROM projects p
WHERE b.project_id = p.id
  AND b.name = 'Board Principal';

-- 3) Criar sprint ativa "01 <NOME>" para projetos sem sprint
INSERT INTO sprints (workspace_id, project_id, name, is_active)
SELECT p.workspace_id, p.id, '01 ' || p.name, true
FROM projects p
WHERE p.is_archived = false
  AND NOT EXISTS (SELECT 1 FROM sprints s WHERE s.project_id = p.id);

COMMIT;
