#!/usr/bin/env bash
# Alias legado — usa scripts/dump-database.sh
exec "$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)/dump-database.sh" "$@"
