#!/usr/bin/env bash
# Exporta o PostgreSQL local (estrutura + dados) para um ficheiro SQL importável no Neon.
#
# Requisitos: PostgreSQL client tools (`pg_dump` no PATH), ex.: `brew install libpq` e
# `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`.
#
# Uso:
#   ./scripts/export-local-db-for-neon.bash
#   DATABASE_URL="postgresql://..." ./scripts/export-local-db-for-neon.bash
#   ENV_FILE=/caminho/.env ./scripts/export-local-db-for-neon.bash
#
# Depois, no Neon (consola → SQL ou `psql` com a connection string com SSL):
#   psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f db-export/studio_assets_....sql
#
# Aviso: se a base no Neon já tiver objetos, pode ser preciso apagá-la ou usar outro
# database/schema; `pg_dump` por omissão inclui CREATE que podem conflitar.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
OUT_DIR="${OUT_DIR:-./db-export}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$OUT_DIR/studio_assets_${TIMESTAMP}.sql"

extract_database_url_from_file() {
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

# Prisma: ?schema=... na URL — pg_dump não aceita.
database_url_for_pg_tools() {
  local url="$1"
  url="$(printf '%s' "$url" | sed -E \
    -e 's/\?schema=[^&]*&/?/' \
    -e 's/\?schema=[^&]*$//' \
    -e 's/&schema=[^&]*//g')"
  printf '%s' "$url"
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  DATABASE_URL="$(extract_database_url_from_file "$ENV_FILE" || true)"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Defina DATABASE_URL no ambiente ou em ${ENV_FILE} (linha DATABASE_URL=...)." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump não encontrado. Instale as ferramentas cliente do PostgreSQL (ex.: brew install libpq)." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

DATABASE_PG_URL="$(database_url_for_pg_tools "$DATABASE_URL")"

echo "A exportar para: ${OUT_FILE}"
echo "(origem: DATABASE_URL → host da base local ou remota configurada)"
echo ""

pg_dump "$DATABASE_PG_URL" \
  --format=plain \
  --encoding=UTF8 \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --verbose \
  --file="$OUT_FILE"

echo ""
echo "Ficheiro gerado: ${OUT_FILE}"
BYTES="$(wc -c <"$OUT_FILE" | tr -d ' ')"
echo "Tamanho: ${BYTES} bytes"
echo ""
echo "Importar no Neon (exemplo):"
echo "  export NEON_DATABASE_URL='postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require'"
echo "  psql \"\$NEON_DATABASE_URL\" -v ON_ERROR_STOP=1 -f \"${OUT_FILE}\""
echo ""
echo "Opcional (ficheiro menor): gzip -k \"${OUT_FILE}\""
echo "  zcat \"${OUT_FILE}.gz\" | psql \"\$NEON_DATABASE_URL\" -v ON_ERROR_STOP=1"
