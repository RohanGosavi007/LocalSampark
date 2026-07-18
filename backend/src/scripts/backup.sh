#!/bin/bash
# LocalSampark Automatic Database Backup Utility
DB_NAME=${DB_NAME:-"localsampark"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"
echo "Starting PostgreSQL backup for $DB_NAME..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -F c -b -v -f "$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.dump"
echo "Backup successfully completed at $BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.dump"
