#!/usr/bin/env bash
# Cria um dump SQL do PostgreSQL configurado no .env (local ou Neon).
#
# Requisitos: `pg_dump` no PATH (ex.: `brew install libpq` e
# `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`).
#
# Uso:
#   ./scripts/dump-database.sh
#   npm run db:dump
#   GZIP=1 ./scripts/dump-database.sh
#   ENV_FILE=/caminho/.env ./scripts/dump-database.sh
#
# Restaurar o último backup: npm run db:restore

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/db-pg-env.sh
source "$SCRIPT_DIR/lib/db-pg-env.sh"

cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
OUT_DIR="${OUT_DIR:-./db-export}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$OUT_DIR/studio_assets_${TIMESTAMP}.sql"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump não encontrado. Instale as ferramentas cliente do PostgreSQL (ex.: brew install libpq)." >&2
  exit 1
fi

if ! DATABASE_URL="$(resolve_database_url)"; then
  echo "Defina DATABASE_URL no ambiente ou em ${ENV_FILE}." >&2
  echo "Com Neon, prefira DIRECT_URL (conexão sem pooler) para o dump." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

DATABASE_PG_URL="$(database_url_for_pg_tools "$DATABASE_URL")"

echo "A exportar para: ${OUT_FILE}"
if [[ -n "${DIRECT_URL:-}" ]] || grep -q '^[[:space:]]*DIRECT_URL=' "$ENV_FILE" 2>/dev/null; then
  echo "(origem: DIRECT_URL ou equivalente)"
elif [[ "$DATABASE_PG_URL" == *"-pooler."* ]]; then
  echo "(aviso: URL com pooler — se o dump falhar, use DIRECT_URL no .env)" >&2
fi
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

BYTES="$(wc -c <"$OUT_FILE" | tr -d ' ')"
echo ""
echo "Ficheiro gerado: ${OUT_FILE}"
echo "Tamanho: ${BYTES} bytes"

if [[ "${GZIP:-}" == "1" ]] || [[ "${1:-}" == "--gzip" ]]; then
  gzip -k "$OUT_FILE"
  echo "Comprimido: ${OUT_FILE}.gz"
fi

echo ""
echo "Rollback (último backup): npm run db:restore"
