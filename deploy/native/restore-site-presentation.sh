#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ $EUID -ne 0 ]]; then echo 'Run as root with sudo.' >&2; exit 1; fi
if [[ -z ${1:-} || -z ${KEEP_ADMIN_EMAIL:-} ]]; then
  echo 'Usage: KEEP_ADMIN_EMAIL=... bash restore-site-presentation.sh /absolute/source/backup' >&2
  exit 2
fi
source_backup=$(realpath -e "$1")
[[ $source_backup == /var/backups/elsadatrealestate/* && -d $source_backup ]]
(
  cd "$source_backup"
  sha256sum --check --status SHA256SUMS
)
release=$(readlink -e /opt/elsadatrealestate/current)
source "$release/deploy/native/deployment-lock.sh"
operator_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
admin_email=$KEEP_ADMIN_EMAIL
env_file=${PRODUCTION_ENV_FILE:-/etc/elsadatrealestate/production.env}
set -a
source "$env_file"
set +a
export KEEP_ADMIN_EMAIL=$admin_email PRODUCTION_ENV_FILE=$env_file
export PRODUCTION_RESTORE_SOURCE_BACKUP=$source_backup

stopped=false
runner=''
restore_services() {
  local status=$?
  trap - EXIT HUP INT TERM
  if [[ $stopped == true ]]; then systemctl start elsadat-api.service elsadat-web.service || status=1; fi
  if [[ -n $runner ]]; then rm -f -- "$runner"; fi
  exit "$status"
}
trap restore_services EXIT
trap 'exit 130' INT
trap 'exit 143' HUP TERM
stopped=true
systemctl stop elsadat-api.service elsadat-web.service
# Preserve the current production state before adding any recovered documents.
runuser -u elsadat --preserve-environment -- bash "$release/deploy/native/backup.sh"
# /root is intentionally inaccessible to the application account.
runner=$(mktemp /tmp/elsadat-restore-presentation.XXXXXX.mjs)
install -o elsadat -g elsadat -m 0640 "$operator_root/scripts/restore-site-presentation.mjs" "$runner"
runuser -u elsadat --preserve-environment -- node "$runner"
systemctl start elsadat-api.service elsadat-web.service
stopped=false
bash "$release/deploy/native/healthcheck.sh"
echo 'PRESENTATION_RESTORE_COMPLETE services=healthy'
