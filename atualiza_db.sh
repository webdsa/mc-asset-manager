#!/usr/bin/env bash
# 1) pg_dump da base local (DATABASE_URL no .env → esperado localhost)
# 2) psql import no Neon (o dump usa --clean para apagar tipos/tabelas já existentes no destino)
# 3) prisma db push no Neon (schema alinhado ao Prisma)
#
# Uso: ./atualiza_db.sh
#      LOCAL_DATABASE_URL="postgresql://..." ./atualiza_db.sh
#
# Requisitos: pg_dump, psql (brew install libpq)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# --- destino Neon (mantém as tuas URLs aqui ou exporta no ambiente)
NEON_DATABASE_URL="${NEON_DATABASE_URL:-postgresql://neondb_owner:npg_L1otGd8DpFRP@ep-square-dawn-ac8a2lhf-pooler.sa-east-1.aws.neon.tech/asset_manager?sslmode=require&channel_binding=require}"
# Prisma CLI no Neon: preferir host sem -pooler (derivado do pooler se não definires)
if [[ -z "${NEON_DIRECT_URL:-}" ]]; then
  NEON_DIRECT_URL="$(printf '%s' "$NEON_DATABASE_URL" | sed 's/-pooler\././')"
else
  NEON_DIRECT_URL="${NEON_DIRECT_URL}"
fi

ENV_FILE="${ENV_FILE:-.env}"
DUMP_DIR="${DUMP_DIR:-./db-export}"
TS="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="${DUMP_DIR}/local_to_neon_${TS}.sql"

# Prisma usa ?schema=public na DATABASE_URL; pg_dump/psql rejeitam esse parâmetro.
database_url_for_pg_tools() {
  local url="$1"
  url="$(printf '%s' "$url" | sed -E \
    -e 's/\?schema=[^&]*&/?/' \
    -e 's/\?schema=[^&]*$//' \
    -e 's/&schema=[^&]*//g')"
  printf '%s' "$url"
}

extract_database_url_from_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  local line
  line="$(grep -E '^[[:space:]]*DATABASE_URL=' "$f" | head -n1)" || return 1
  line="${line#*=}"
  line="${line%$'\r'}"
  if [[ "${line:0:1}" == '"' ]]; then
    line="${line:1}"
    line="${line%\"}"
  elif [[ "${line:0:1}" == "'" ]]; then
    line="${line:1}"
    line="${line%\'}"
  fi
  printf '%s' "$line"
}

if [[ -z "${LOCAL_DATABASE_URL:-}" ]]; then
  LOCAL_DATABASE_URL="$(extract_database_url_from_env_file "$ENV_FILE" || true)"
fi

if [[ -z "${LOCAL_DATABASE_URL:-}" ]]; then
  echo "Defina LOCAL_DATABASE_URL ou coloque DATABASE_URL em ${ENV_FILE} (base local)." >&2
  exit 1
fi

if printf '%s' "$LOCAL_DATABASE_URL" | grep -qi 'neon\.tech'; then
  echo "Aviso: DATABASE_URL em ${ENV_FILE} parece ser Neon, não local. Usa LOCAL_DATABASE_URL apontando ao Postgres local." >&2
  exit 1
fi

for cmd in pg_dump psql npx; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Comando necessário em falta: $cmd" >&2
    exit 1
  }
done

mkdir -p "$DUMP_DIR"

LOCAL_PG_URL="$(database_url_for_pg_tools "$LOCAL_DATABASE_URL")"
NEON_PG_URL="$(database_url_for_pg_tools "$NEON_DATABASE_URL")"

echo "==> Dump local → ${DUMP_FILE}"
pg_dump "$LOCAL_PG_URL" \
  --format=plain \
  --encoding=UTF8 \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --file="$DUMP_FILE"

echo "==> Import no Neon (psql)"
psql "$NEON_PG_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "==> prisma db push (Neon)"
export DATABASE_URL="$NEON_DATABASE_URL"
export DIRECT_URL="$NEON_DIRECT_URL"
npx prisma db push

echo "Concluído. Dump guardado em: ${DUMP_FILE}"
