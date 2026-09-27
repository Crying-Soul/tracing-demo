#!/bin/bash
set -e

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
    PGPASSWORD="$REPLICATOR_PASSWORD" pg_basebackup \
        -h postgres-master \
        -p 5432 \
        -U replicator \
        -D "$PGDATA" \
        -Fp -Xs -P -R \
        -C -S "$STANDBY_SLOT_NAME"

    chown -R postgres:postgres "$PGDATA"
    echo "pg_basebackup завершён."
fi

exec docker-entrypoint.sh postgres \
    -c config_file=/etc/postgresql/postgresql.conf \
    -c hba_file=/etc/postgresql/pg_hba.conf
