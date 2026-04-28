#!/usr/bin/env sh
# backup-db.sh — Postgres backup → S3, retém 7 dias localmente.
# Uso:
#   DATABASE_URL=... BACKUP_S3_BUCKET=meu-bucket ./scripts/backup-db.sh
#
# Requer: pg_dump (postgresql-client), aws cli.
set -eu

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

fail() {
  log "ERRO: $*" >&2
  exit 1
}

# --- Validação de env -------------------------------------------------------
[ -n "${DATABASE_URL:-}" ]    || fail "DATABASE_URL não definida"
[ -n "${BACKUP_S3_BUCKET:-}" ] || fail "BACKUP_S3_BUCKET não definida"

command -v pg_dump >/dev/null 2>&1 || fail "pg_dump não encontrado no PATH"
command -v aws     >/dev/null 2>&1 || fail "aws cli não encontrado no PATH"

# --- Setup ------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +'%Y-%m-%d-%H%M')"
DUMP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.dump"

# --- Dump -------------------------------------------------------------------
log "Iniciando pg_dump → $DUMP_FILE"
pg_dump \
  --format=custom \
  --no-acl \
  --no-owner \
  --dbname="$DATABASE_URL" \
  --file="$DUMP_FILE"

DUMP_SIZE="$(wc -c < "$DUMP_FILE" | tr -d ' ')"
log "Dump concluído ($DUMP_SIZE bytes)"

# --- Upload S3 --------------------------------------------------------------
S3_KEY="postgres/backup-$TIMESTAMP.dump"
S3_URI="s3://$BACKUP_S3_BUCKET/$S3_KEY"

log "Upload para $S3_URI"
aws s3 cp "$DUMP_FILE" "$S3_URI" --only-show-errors
log "Upload OK"

# --- Retenção local: 7 dias --------------------------------------------------
log "Limpando backups locais com mais de 7 dias em $BACKUP_DIR"
find "$BACKUP_DIR" -type f -name 'backup-*.dump' -mtime +7 -print -delete || true

log "Backup finalizado com sucesso"
