#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd "$(dirname "$0")/../.."
mode=${1:-plan}
manifest=${2:-/var/backups/elsadatrealestate/trial-content-plan.json}
confirmation=${3:-}
if [[ $EUID -ne 0 ]]; then echo 'Run with sudo.' >&2; exit 1; fi
mkdir -p /var/backups/elsadatrealestate
if [[ $mode == show || $mode == select-all ]]; then
  exec node scripts/trial-content-cleanup.mjs "$mode" "$manifest" "$confirmation"
fi
set -a
# shellcheck disable=SC1090
source "${PRODUCTION_ENV_FILE:-/etc/elsadatrealestate/production.env}"
set +a
if [[ $mode == backup ]]; then
  exec bash deploy/native/backup.sh
fi
if [[ $mode == apply ]]; then
  if [[ $confirmation != DELETE_REVIEWED_TRIAL_CONTENT ]]; then echo 'TRIAL_CLEANUP_CONFIRMATION_REQUIRED' >&2; exit 2; fi
  # Quiesce writers for an exact preview-to-apply comparison. Restore services on failure too.
  trap 'systemctl start elsadat-api.service elsadat-web.service' EXIT
  systemctl stop elsadat-api.service elsadat-web.service
  node scripts/trial-content-cleanup.mjs apply "$manifest" "$confirmation"
else
  node scripts/trial-content-cleanup.mjs "$mode" "$manifest" "$confirmation"
fi
