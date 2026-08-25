#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_ROOT=${BACKUP_ROOT:-/var/backups/elsadatrealestate}
RETENTION=${BACKUP_RETENTION_DAYS:-14}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DESTINATION="$BACKUP_ROOT/$STAMP"
CONFIG=$(mktemp /tmp/elsadat-mongo-tools.XXXXXX.yml)
trap 'rm -f "$CONFIG"' EXIT
mkdir -p "$DESTINATION"
printf 'uri: "%s"\n' "${MONGODB_URI:?missing MONGODB_URI}" > "$CONFIG"
chmod 0600 "$CONFIG"

mongodump --config "$CONFIG" --archive="$DESTINATION/mongodb.archive.gz" --gzip
tar -C /var/lib/elsadatrealestate -czf "$DESTINATION/private-files.tar.gz" private
sha256sum "$DESTINATION/mongodb.archive.gz" "$DESTINATION/private-files.tar.gz" > "$DESTINATION/SHA256SUMS"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime "+$RETENTION" -exec rm -rf -- {} +
echo "NATIVE_BACKUP_OK path=$DESTINATION off_server_copy_required=true"

