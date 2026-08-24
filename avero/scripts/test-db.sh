#!/usr/bin/env bash
# Starter en lokal PostgreSQL-instans for sikkerhetstestene.
# Testene kjorer de ekte migrasjonene og de ekte RLS-policyene.
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/tmp/avero-testdb/data}
PGPORT=${PGPORT:-55432}
PGSOCK=${PGSOCK:-/tmp/avero-testdb/sock}

case "${1:-up}" in
  up)
    if [ ! -d "$PGDATA" ]; then
      mkdir -p "$PGDATA" "$PGSOCK"
      chown -R postgres:postgres /tmp/avero-testdb
      su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust -E UTF8" >/dev/null
    fi
    # Datakatalogen ma ha strenge rettigheter, ellers nekter serveren a starte.
    chmod 700 "$PGDATA"
    chown -R postgres:postgres /tmp/avero-testdb
    if ! su postgres -c "$PGBIN/pg_isready -h $PGSOCK -p $PGPORT" >/dev/null 2>&1; then
      su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k $PGSOCK -c listen_addresses=127.0.0.1' -l $PGDATA/server.log start" >/dev/null
      sleep 1
    fi
    su postgres -c "$PGBIN/psql -h $PGSOCK -p $PGPORT -U postgres -tc \"select 1 from pg_database where datname='avero_test'\"" \
      | grep -q 1 || su postgres -c "$PGBIN/createdb -h $PGSOCK -p $PGPORT -U postgres avero_test"
    echo "PostgreSQL kjorer pa port $PGPORT (database avero_test)"
    ;;
  down)
    su postgres -c "$PGBIN/pg_ctl -D $PGDATA -m fast stop" >/dev/null 2>&1 || true
    echo "PostgreSQL stoppet"
    ;;
  reset)
    su postgres -c "$PGBIN/psql -h $PGSOCK -p $PGPORT -U postgres -c 'drop database if exists avero_test'" >/dev/null
    su postgres -c "$PGBIN/createdb -h $PGSOCK -p $PGPORT -U postgres avero_test"
    echo "Database nullstilt"
    ;;
esac
