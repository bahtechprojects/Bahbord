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

## Email transacional (welcome)

Quando um admin aprova um pedido de acesso (`org_access`), o sistema envia um e-mail de boas-vindas via [Resend](https://resend.com). Para habilitar, configure `RESEND_API_KEY` e (opcionalmente) `EMAIL_FROM` no `.env.local`. Sem essas variáveis o fluxo de aprovação continua funcionando normalmente — apenas o envio do e-mail é pulado, com um `console.warn`.

## Deploy

Deploy via EasyPanel ou Vercel. Requer `DATABASE_URL` e Clerk configurado.

## Backup

Backup diário do Postgres roda via GitHub Actions (`.github/workflows/backup.yml`) todos os dias às 03:00 UTC. O job usa `pg_dump --format=custom --no-acl --no-owner` (script em `scripts/backup-db.sh`), gera um arquivo `backup-YYYY-MM-DD-HHmm.dump`, sobe pro S3 (`s3://$BACKUP_S3_BUCKET/postgres/`) e mantém localmente os backups dos últimos 7 dias.

Para configurar, crie um bucket S3 privado e adicione os seguintes secrets em **Settings → Secrets and variables → Actions** do repositório: `DATABASE_URL` (string de conexão Postgres com permissão de leitura), `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` (credenciais com permissão `s3:PutObject` no bucket), `BACKUP_S3_BUCKET` (nome do bucket) e opcionalmente `AWS_REGION` (padrão `us-east-1`). Para rodar manualmente: `DATABASE_URL=... BACKUP_S3_BUCKET=... ./scripts/backup-db.sh` (requer `pg_dump` e `aws` cli locais).
