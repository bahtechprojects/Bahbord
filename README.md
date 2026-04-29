# Bahboard

Sistema de gestão de projetos profissional construído com Next.js 14, Clerk, Postgres e Supabase.

## Features principais

- Kanban board com drag & drop
- Dashboard com gráficos e métricas
- Sprints com burndown chart
- Comentários com @mention e reações
- IA: gerar descrição e resumir threads
- Automações (rules engine)
- Relatórios e exports (CSV/PDF)
- Links públicos para clientes
- Integração GitHub (PRs e commits)
- Tema claro/escuro
- Command Palette (Cmd+K)

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Clerk (auth)
- Supabase (realtime)
- Anthropic Claude (AI)
- Google Drive (file uploads)

## Setup local

1. Clone o repo
2. Copy `.env.example` to `.env.local` and fill in values
3. Install: `npm install --legacy-peer-deps`
4. Run migrations: aplicar arquivos em `db/` no Postgres
5. Dev: `npm run dev`

## Scripts

- `npm run dev` - ambiente de desenvolvimento
- `npm run build` - build de produção
- `npm run typecheck` - verificar tipos
- `npm run test` - rodar testes
- `npm run lint` - lint
- `npm run e2e` - testes E2E Playwright
- `npm run e2e:ui` - Playwright em modo UI

## Tests E2E

Os testes E2E (Playwright) ficam em `e2e/` e cobrem três fluxos críticos: criar ticket, mover card entre colunas (drag-and-drop) e criar comentário. Para rodar localmente: (1) suba o Postgres em `localhost:5432` com seed aplicado, (2) configure `CLERK_TEST_EMAIL` e `CLERK_TEST_PASSWORD` no `.env.local` apontando para um usuário de teste **já aprovado** no Clerk Dashboard (a auth roda via [Clerk Testing Tokens](https://clerk.com/docs/testing/playwright)), (3) defina `E2E_BOARD_ID` (UUID de um board existente) e opcionalmente `E2E_TICKET_ID`, (4) rode `npm run e2e`. O Playwright sobe o `npm run dev` automaticamente (ou reusa um já em execução). Use `npm run e2e:ui` para o modo interativo.

## Email transacional (welcome)

Quando um admin aprova um pedido de acesso (`org_access`), o sistema envia um e-mail de boas-vindas via [Resend](https://resend.com). Para habilitar, configure `RESEND_API_KEY` e (opcionalmente) `EMAIL_FROM` no `.env.local`. Sem essas variáveis o fluxo de aprovação continua funcionando normalmente — apenas o envio do e-mail é pulado, com um `console.warn`.

## Email-to-ticket

> **Status:** Próxima feature — não implementado. Estimativa: ~2h pra construir o handler + UI mínima de mapeamento email→projeto. Esta seção é o guia de configuração pra quando for ligar.

Permite criar tickets enviando email pro endereço de um projeto (ex: `bug@bahflow.app` cai como ticket no projeto "Bug Tracker"). A ideia é receber webhooks de um provider de Inbound Email e converter em ticket via uma rota interna.

### Provider recomendado: SendGrid Inbound Parse

[SendGrid Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook) é grátis até 100 emails/dia e entrega o email já parseado como `multipart/form-data` num webhook HTTP. Alternativas equivalentes: Mailgun Routes, Postmark Inbound, AWS SES + Lambda.

### Setup DNS + SendGrid (uma vez)

1. **MX record**: aponta o subdomínio que vai receber tickets (ex: `bahflow.app` ou `tickets.bahflow.app`) para `mx.sendgrid.net` com priority `10`.
2. **SendGrid Dashboard → Settings → Inbound Parse → Add Host & URL**:
   - Hostname: `bahflow.app` (ou `tickets.bahflow.app`)
   - Destination URL: `https://<seu-dominio>/api/inbound-email`
   - Marque **POST the raw, full MIME message** desligado (queremos o payload já parseado).
3. **Variáveis de ambiente** no `.env.local`:
   - `INBOUND_EMAIL_SECRET` — token compartilhado, validado por header `X-Webhook-Secret` no handler.
   - `INBOUND_EMAIL_DOMAIN` — domínio aceito (ex: `bahflow.app`); rejeita qualquer outro `to`.

### Schema do POST que o SendGrid envia

`Content-Type: multipart/form-data` com pelo menos os campos:

| Campo         | Tipo   | Exemplo                                    |
|---------------|--------|--------------------------------------------|
| `to`          | string | `bug@bahflow.app`                          |
| `from`        | string | `"Cliente X" <cliente@empresa.com>`        |
| `subject`     | string | `[BUG] Login não funciona no Safari`       |
| `text`        | string | corpo do email em texto puro               |
| `html`        | string | corpo do email em HTML (opcional)          |
| `attachments` | int    | quantidade de anexos                       |
| `attachment1`, `attachment2`, … | file | binários dos anexos     |
| `envelope`    | JSON   | `{"to":["bug@bahflow.app"],"from":"…"}` |

### Mapeamento email → projeto

Cria uma tabela auxiliar (migration futura `db/044_email_aliases.sql`):

```sql
CREATE TABLE email_aliases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  local_part  TEXT NOT NULL,            -- "bug" em "bug@bahflow.app"
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  default_priority TEXT DEFAULT 'medium',
  is_active   BOOLEAN DEFAULT true,
  UNIQUE (workspace_id, local_part)
);
```

UI: aba nova em `Configurações → Email-to-ticket` lista os aliases e permite criar/editar/remover.

### Pseudocódigo do handler `app/api/inbound-email/route.ts`

```ts
export async function POST(request: Request) {
  // 1. Auth: validar secret no header (SendGrid suporta basic-auth na URL)
  if (request.headers.get('x-webhook-secret') !== process.env.INBOUND_EMAIL_SECRET) {
    return new Response('forbidden', { status: 403 });
  }

  // 2. Parsear multipart
  const form = await request.formData();
  const to = String(form.get('to') ?? '');
  const from = String(form.get('from') ?? '');
  const subject = String(form.get('subject') ?? '(sem assunto)').slice(0, 200);
  const text = String(form.get('text') ?? '').slice(0, 50_000);

  // 3. Extrair local-part e validar domínio
  const match = to.match(/<?([^@<>]+)@([^>]+)>?/);
  if (!match || match[2] !== process.env.INBOUND_EMAIL_DOMAIN) {
    return new Response('unknown recipient', { status: 200 }); // 200 pra não retentar
  }
  const localPart = match[1].toLowerCase();

  // 4. Lookup alias → projeto
  const alias = await query(
    `SELECT project_id, ticket_type_id, default_priority
       FROM email_aliases
      WHERE local_part = $1 AND is_active = true LIMIT 1`,
    [localPart]
  );
  if (!alias.rows[0]) return new Response('no alias', { status: 200 });

  // 5. Achar reporter (member com mesmo email) ou null
  const fromEmail = (from.match(/<([^>]+)>/)?.[1] ?? from).toLowerCase();
  const reporter = await query(
    `SELECT id FROM members WHERE LOWER(email) = $1 LIMIT 1`,
    [fromEmail]
  );

  // 6. Resolver default board + status inicial do projeto
  // 7. INSERT INTO tickets (...) com title=subject, description=text (ou html sanitizado)
  // 8. (Opcional) attachments → upload pra Drive/S3 e linkar
  // 9. (Opcional) notificar assignee default por email/Slack

  return new Response('ok', { status: 200 });
}
```

### Casos de borda a tratar quando for implementar

- **Auto-replies / out-of-office**: filtrar por header `Auto-Submitted: auto-replied` ou `X-Auto-Response-Suppress`.
- **Loops**: se `from` for o próprio domínio do alias, dropar.
- **Threads / replies**: detectar `In-Reply-To` ou `Re:` no subject e adicionar como comentário num ticket existente, em vez de criar novo.
- **Spam**: SendGrid já marca, ler campo `spam_score` e rejeitar > 5.
- **Tamanho**: truncar `text` em ~50KB pra não estourar a coluna.
- **Anexos**: limitar quantidade e tamanho total; rodar upload em background pra não estourar o timeout do webhook.

## Deploy

Deploy via EasyPanel ou Vercel. Requer `DATABASE_URL` e Clerk configurado.

## Backup

Backup diário do Postgres roda via GitHub Actions (`.github/workflows/backup.yml`) todos os dias às 03:00 UTC. O job usa `pg_dump --format=custom --no-acl --no-owner` (script em `scripts/backup-db.sh`), gera um arquivo `backup-YYYY-MM-DD-HHmm.dump`, sobe pro S3 (`s3://$BACKUP_S3_BUCKET/postgres/`) e mantém localmente os backups dos últimos 7 dias.

Para configurar, crie um bucket S3 privado e adicione os seguintes secrets em **Settings → Secrets and variables → Actions** do repositório: `DATABASE_URL` (string de conexão Postgres com permissão de leitura), `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` (credenciais com permissão `s3:PutObject` no bucket), `BACKUP_S3_BUCKET` (nome do bucket) e opcionalmente `AWS_REGION` (padrão `us-east-1`). Para rodar manualmente: `DATABASE_URL=... BACKUP_S3_BUCKET=... ./scripts/backup-db.sh` (requer `pg_dump` e `aws` cli locais).
