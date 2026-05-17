#!/usr/bin/env bash
# Restaura o último dump em ./db-export/ (criado por scripts/dump-database.sh).
# O dump inclui DROP (--clean); todos os dados atuais serão substituídos.
#
# Requisitos: `psql` no PATH (ex.: brew install libpq).
#
# Uso:
#   ./scripts/restore-database.sh
#   npm run db:restore
#   YES=1 npm run db:restore          # sem confirmação interativa
#   RESTORE_FILE=./db-export/foo.sql ./scripts/restore-database.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/db-pg-env.sh
source "$SCRIPT_DIR/lib/db-pg-env.sh"

cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
OUT_DIR="${OUT_DIR:-./db-export}"

find_latest_backup() {
  local latest=""
  local f
  shopt -s nullglob
  local -a files=("$OUT_DIR"/studio_assets_*.sql "$OUT_DIR"/studio_assets_*.sql.gz)
  shopt -u nullglob
  if ((${#files[@]} == 0)); then
    return 1
  fi
  for f in "${files[@]}"; do
    if [[ -z "$latest" ]] || [[ "$f" -nt "$latest" ]]; then
      latest="$f"
    fi
  done
  printf '%s' "$latest"
}

usage() {
  cat <<EOF
Uso: $(basename "$0") [--yes] [--file CAMINHO]

  --yes     Não pedir confirmação (equivalente a YES=1)
  --file    Ficheiro .sql ou .sql.gz a restaurar (em vez do mais recente)

Variáveis: RESTORE_FILE, YES=1, OUT_DIR, ENV_FILE
EOF
}

RESTORE_FILE="${RESTORE_FILE:-}"
AUTO_YES="${YES:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes | -y)
      AUTO_YES=1
      shift
      ;;
    --file)
      [[ $# -ge 2 ]] || {
        echo "Falta o caminho após --file." >&2
        exit 1
      }
      RESTORE_FILE="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Opção desconhecida: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v psql >/dev/null 2>&1; then
  echo "psql não encontrado. Instale as ferramentas cliente do PostgreSQL (ex.: brew install libpq)." >&2
  exit 1
fi

if ! DATABASE_URL="$(resolve_database_url)"; then
  echo "Defina DATABASE_URL no ambiente ou em ${ENV_FILE}." >&2
  echo "Com Neon, prefira DIRECT_URL (conexão sem pooler) para restaurar." >&2
  exit 1
fi

if [[ -z "$RESTORE_FILE" ]]; then
  if ! RESTORE_FILE="$(find_latest_backup)"; then
    echo "Nenhum backup encontrado em ${OUT_DIR}/ (esperado studio_assets_*.sql ou .sql.gz)." >&2
    echo "Crie um com: npm run db:dump" >&2
    exit 1
  fi
fi

if [[ ! -f "$RESTORE_FILE" ]]; then
  echo "Ficheiro não encontrado: ${RESTORE_FILE}" >&2
  exit 1
fi

DATABASE_PG_URL="$(database_url_for_pg_tools "$DATABASE_URL")"

# Mascarar password na URL para exibição
display_url="$(printf '%s' "$DATABASE_PG_URL" | sed -E 's#(://[^:]+:)[^@]+(@)#\1****\2#')"

echo "Backup:  ${RESTORE_FILE}"
echo "Destino: ${display_url}"
echo ""
echo "ATENÇÃO: a base atual será apagada e reposta com o conteúdo deste dump."
echo ""

if [[ "$AUTO_YES" != "1" ]]; then
  read -r -p "Continuar? [y/N] " confirm
  case "${confirm:-}" in
    y | Y | yes | YES) ;;
    *)
      echo "Cancelado."
      exit 0
      ;;
  esac
fi

echo ""
echo "A restaurar..."

if [[ "$RESTORE_FILE" == *.gz ]]; then
  if ! command -v zcat >/dev/null 2>&1 && ! command -v gzcat >/dev/null 2>&1; then
    echo "zcat/gzcat não encontrado para ler ${RESTORE_FILE}." >&2
    exit 1
  fi
  ZCAT="$(command -v zcat || command -v gzcat)"
  "$ZCAT" "$RESTORE_FILE" | psql "$DATABASE_PG_URL" -v ON_ERROR_STOP=1 -q
else
  psql "$DATABASE_PG_URL" -v ON_ERROR_STOP=1 -q -f "$RESTORE_FILE"
fi

echo ""
echo "Restauração concluída a partir de: ${RESTORE_FILE}"
