#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_DIR=${1:-}
TARGET=${RESTORE_TARGET_DATABASE:-sadat_restore_verify}
if [[ -z "$BACKUP_DIR" || ! -f "$BACKUP_DIR/mongodb.archive.gz" || ! -f "$BACKUP_DIR/SHA256SUMS" ]]; then
  echo 'Usage: restore.sh /absolute/path/to/backup-directory' >&2
  exit 1
fi
if [[ $TARGET == 'sadat' && ${RESTORE_CONFIRM:-} != 'REPLACE_PRODUCTION' ]]; then
  echo 'Production restore requires RESTORE_CONFIRM=REPLACE_PRODUCTION.' >&2
  exit 1
fi

cd "$BACKUP_DIR"
sha256sum --check SHA256SUMS
CONFIG=$(mktemp /tmp/elsadat-mongo-tools.XXXXXX.yml)
trap 'rm -f "$CONFIG"' EXIT
printf 'uri: "%s"\n' "${MONGODB_URI:?missing MONGODB_URI}" > "$CONFIG"
chmod 0600 "$CONFIG"

mongorestore --config "$CONFIG" --archive="$BACKUP_DIR/mongodb.archive.gz" --gzip \
  --nsFrom='sadat.*' --nsTo="$TARGET.*" --drop

if [[ $TARGET == 'sadat' ]]; then
  tar -C /var/lib/elsadatrealestate -xzf "$BACKUP_DIR/private-files.tar.gz"
fi
echo "NATIVE_RESTORE_OK target=$TARGET"

