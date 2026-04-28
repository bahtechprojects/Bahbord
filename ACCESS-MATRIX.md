# Matriz de Acesso — Bah!Flow

Mapeamento de permissões. Atualizar SEMPRE que adicionar uma rota nova.

## Roles

- **owner** — dono da organização. Acesso total.
- **admin** — admin da organização. Acesso total. Próximo ao owner.
- **member** — membro aprovado. Vê apenas projetos onde foi atribuído.
- **viewer** — leitura-only em boards específicos.
- **pendente (`is_approved=false`)** — não aprovado. Bloqueado em quase tudo.

## Helpers de proteção

### Server-side ([lib/page-guards.ts](lib/page-guards.ts))

- `requireAuth()` → autenticado, qualquer role. Não verifica aprovação.
- `requireApproved()` → autenticado **+ aprovado** (admin bypassa). Pendente vai pra `/pending-approval`.
- `requireAdmin()` → owner/admin. Outros vão pra `/my-tasks`.

### API-side ([lib/api-auth.ts](lib/api-auth.ts) + [lib/access-check.ts](lib/access-check.ts))

- `getAuthMember()` → retorna member ou null.
- `isAdmin(role)` → bool.
- `hasBoardAccess(auth, boardId)` → admin OU board_role OU project_role no projeto do board.
- `hasProjectAccess(auth, projectId)` → admin OU project_role OU board_role em algum board do projeto.
- `hasTicketAccess(auth, ticketId)` → resolve via board_id/project_id do ticket.

## Pages (server-side, redirect)

| Rota | Guard | Notas |
|------|-------|-------|
| `/` | `requireAdmin` | Dashboard global. Membros redirecionados pra `/my-tasks`. |
| `/board` | `requireApproved` + `hasBoardAccess`/`hasProjectAccess` | Sem acesso ao board → `/my-tasks`. |
| `/list` | `requireApproved` + acesso | idem |
| `/backlog` | `requireApproved` + acesso | idem |
| `/ticket/[id]` | `requireApproved` (UI fallback faz 403/404) | API checa `hasTicketAccess`. |
| `/inbox` | `requireApproved` | Notificações filtradas por recipient_id. |
| `/my-tasks` | `requireApproved` | Só tickets do user. |
| `/this-week` | `requireApproved` | Só tickets do user com prazo na semana. |
| `/pending-approval` | nenhum (auto-redirect se aprovado) | Tela de espera. |
| `/sprints` | `requireAdmin` | Gestão de sprints. |
| `/timeline` | `requireAdmin` | Cronograma de tudo. |
| `/timesheet` | `requireAdmin` | Time tracking de todos. |
| `/projects` | `requireAdmin` (via layout) | Listar/criar projetos. |
| `/clients` | `requireAdmin` (via layout) | Gestão de clientes. |
| `/teams` | `requireAdmin` (via layout) | Equipes. |
| `/settings` | `requireAdmin` | Tudo de config (Geral, Membros, Permissões, Aprovações, Webhooks, Integrations…). |
| `/docs` | `requireAdmin` | Documentação interna. |
| `/reports` | `requireAdmin` | Relatórios. |
| `/boards` | `requireAdmin` | Listagem de todos os boards. |
| `/filters` | `requireAdmin` | Filtros salvos. |
| `/share/[slug]` | público (senha) | Dashboard de cliente, bypass de middleware. |
| `/sign-in`, `/sign-up` | público | Clerk. |

## API endpoints

### 🟢 Filtrados por acesso ou ownership

- `GET /api/tickets` — filtra por project_role/board_role pra não-admin.
- `GET /api/tickets/[id]` — `hasTicketAccess`.
- `PATCH /api/tickets/[id]` — `hasTicketAccess`.
- `GET /api/comments?ticket_id=X` — `hasTicketAccess`.
- `PATCH /api/comments` — author OR admin.
- `DELETE /api/comments` — author OR admin.
- `GET /api/notifications` — filtra por `recipient_id = auth.id`.
- `PATCH /api/notifications` — só atualiza notifications do próprio user.
- `GET /api/personal/counts` — só conta do próprio user.
- `GET /api/projects?member_id=X` — filtra por project_role do member.
- `GET /api/boards?member_id=X` — filtra por board/project access.
- `GET /api/options?type=members` — não-admin recebe projeção restrita (sem email/phone), só aprovados.

### 🟡 Admin-checked (bloqueia não-admin)

- Todos os `POST /api/projects`, `PATCH`, `DELETE`.
- Todos os `POST /api/sprints`, `PATCH`, `DELETE` (sob admin).
- `/api/automations` (CRUD).
- `/api/share-links` (CRUD).
- `/api/members/sync-clerk`, `/api/members/with-projects`, `/api/members/role`, `/api/members/assign-project`, `/api/members/assign-board`, `/api/members/grouped-by-project`.
- `/api/settings` (CRUD).
- `/api/approvals` (PATCH).
- `/api/clients`, `/api/services`, `/api/categories`, `/api/statuses`, `/api/ticket-types`, `/api/quick-reactions`, `/api/teams` (CRUD).

### ⚪ Públicos por design

- `POST /api/webhooks/clerk` — assinatura HMAC.
- `POST /api/webhooks/github` — assinatura HMAC.
- `/share/[slug]` — slug + senha.

### ⚠️ Pontos a melhorar (próximas iterações)

- `GET /api/sprints` — hoje retorna todas; ideal filtrar por acesso ao projeto.
- `GET /api/activity` — hoje retorna logs de todos; filtrar por acesso ao ticket.
- `GET /api/access-links`, `/api/attachments`, `/api/time-entries` — validar `hasTicketAccess` antes de retornar.
- `GET /api/audit-trail` — restringir a admin.
- `GET /api/docs/pages` — adicionar `getAuthMember()` e restringir a admin.
- `POST /api/approvals` — adicionar `getAuthMember()`.
- `POST /api/boards` — admin check inconsistente (validar no entrypoint).

## Fluxo de aprovação

1. User cadastra no Clerk → webhook cria `member` com `is_approved=false` + `approval_request` tipo `org_access`.
2. User loga, cai em `getAuthMember()` → retorna o member com `is_approved=false`.
3. **Qualquer page com `requireApproved`** → redirect pra `/pending-approval`.
4. Tela `/pending-approval` mostra "Aguardando aprovação" + botão "Sair".
5. Admin vê o pedido em `/settings?tab=approvals` e aprova.
6. Approval `org_access` → `UPDATE members SET is_approved=true` + `INSERT org_roles`.
7. Próximo login do user → `requireApproved` passa.

## Fluxo "membro tenta acessar algo proibido"

| Cenário | O que acontece |
|---------|----------------|
| Membro pendente acessa `/board?board_id=X` | Server: `requireApproved` → redirect `/pending-approval`. |
| Membro aprovado (sem project_role) acessa `/board?board_id=X` | Server: `hasBoardAccess` falha → redirect `/my-tasks`. |
| Membro aprovado clica em ticket de projeto que não tem acesso | API `/api/tickets/[id]` retorna 403 → UI mostra "Sem acesso". |
| Membro aprovado abre Command Palette | Mostra só ações pessoais (Inbox, Minhas tarefas, Esta semana). Workspace items só pra admin. |
| Membro acessa `/settings` direto via URL | Server: `requireAdmin` → redirect `/my-tasks`. |
