#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PRIVATE_ROOT=${PRIVATE_ROOT:-/var/lib/elsadatrealestate/private}
BACKUP_ROOT=${BACKUP_ROOT:-/var/backups/elsadatrealestate}
BACKUP_DIR=${PRODUCTION_LAUNCH_BACKUP_DIR:-}

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this script as root with sudo.' >&2
  exit 1
fi
if [[ ${PRODUCTION_LAUNCH_CONFIRM:-} != PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN ]]; then
  echo 'PRODUCTION_LAUNCH_CONFIRMATION_REQUIRED' >&2
  exit 2
fi
if [[ -z "$BACKUP_DIR" ]]; then
  echo 'PRODUCTION_LAUNCH_BACKUP_REQUIRED' >&2
  exit 2
fi

resolved_private=$(readlink -e "$PRIVATE_ROOT")
resolved_backup_root=$(readlink -e "$BACKUP_ROOT")
resolved_backup=$(readlink -e "$BACKUP_DIR")
if [[ "$resolved_private" != /var/lib/elsadatrealestate/private ]]; then
  echo 'PRODUCTION_PRIVATE_ROOT_INVALID' >&2
  exit 1
fi
if [[ "$resolved_backup" != "$resolved_backup_root"/* ]]; then
  echo 'PRODUCTION_LAUNCH_BACKUP_OUTSIDE_ROOT' >&2
  exit 1
fi
if [[ ! -s "$resolved_backup/private-files.tar.gz" || ! -s "$resolved_backup/mongodb.archive.gz" || ! -s "$resolved_backup/SHA256SUMS" ]]; then
  echo 'PRODUCTION_LAUNCH_BACKUP_INCOMPLETE' >&2
  exit 1
fi
(
  cd "$resolved_backup"
  sha256sum --check --status SHA256SUMS
)

deleted=$(find "$resolved_private" -mindepth 1 -maxdepth 1 -printf '.' | wc -c)
find "$resolved_private" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
remaining=$(find "$resolved_private" -mindepth 1 -maxdepth 1 -print -quit)
if [[ -n "$remaining" ]]; then
  echo 'PRODUCTION_PRIVATE_FILES_RESIDUE' >&2
  exit 1
fi
echo "PRODUCTION_PRIVATE_FILES_PURGED top_level_entries=$deleted"
