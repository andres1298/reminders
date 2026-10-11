#!/usr/bin/env bash
# Corre las migraciones y las pruebas SQL contra un Postgres temporal.
# Uso: bash supabase/tests/run.sh   (necesita los binarios de PostgreSQL 15+)
# Sin PostgreSQL local (Windows), con Docker desde la raíz del repo:
#   docker run --rm -v "$PWD:/w" -w /w postgres:16 bash -c "PG_BIN=/usr/lib/postgresql/16/bin bash supabase/tests/run.sh"
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
bin="${PG_BIN:-$bin}"
data="$(mktemp -d)"; port="${PG_PORT:-54329}"
runas=()
if [ "$(id -u)" = 0 ]; then chown -R postgres "$data"; runas=(runuser -u postgres --); fi
cleanup() { "${runas[@]}" "$bin/pg_ctl" -D "$data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$data"; }
trap cleanup EXIT
"${runas[@]}" "$bin/initdb" -D "$data" -A trust -U postgres >/dev/null
"${runas[@]}" "$bin/pg_ctl" -D "$data" -o "-p $port -k /tmp -c listen_addresses=''" -w start >/dev/null
psql=(psql -h /tmp -p "$port" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${psql[@]}" -c "create database lukas_test" >/dev/null
"${psql[@]}" -d lukas_test -f "$here/00_supabase_stub.sql" >/dev/null
for m in "$here"/../migrations/*.sql; do "${psql[@]}" -d lukas_test -f "$m" >/dev/null; done
"${psql[@]}" -d lukas_test -f "$here/rls_and_rpc.test.sql"
echo "ok · migraciones y pruebas SQL"
