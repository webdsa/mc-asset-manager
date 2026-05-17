# Funções partilhadas por scripts/dump-database.sh e scripts/restore-database.sh
# Uso: source "$(dirname ...)/lib/db-pg-env.sh"

extract_env_from_file() {
  local f="$1"
  local key="$2"
  [[ -f "$f" ]] || return 1
  local line
  line="$(grep -E "^[[:space:]]*${key}=" "$f" | head -n1)" || return 1
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

# Prisma: ?schema=... na URL — pg_dump/psql não aceitam.
database_url_for_pg_tools() {
  local url="$1"
  url="$(printf '%s' "$url" | sed -E \
    -e 's/\?schema=[^&]*&/?/' \
    -e 's/\?schema=[^&]*$//' \
    -e 's/&schema=[^&]*//g')"
  printf '%s' "$url"
}

resolve_database_url() {
  local url=""
  for key in DIRECT_URL DATABASE_URL_UNPOOLED POSTGRES_URL_NON_POOLING DATABASE_URL; do
    url="${!key:-}"
    if [[ -n "$url" ]]; then
      printf '%s' "$url"
      return 0
    fi
    url="$(extract_env_from_file "${ENV_FILE:-.env}" "$key" || true)"
    if [[ -n "$url" ]]; then
      printf '%s' "$url"
      return 0
    fi
  done
  return 1
}
