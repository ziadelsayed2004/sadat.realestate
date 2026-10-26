#!/usr/bin/env bash
# Run against the already deployed release: no build or deployment between
# reviewing a snapshot and applying its exact hash.
set -Eeuo pipefail
umask 077

if [[ $EUID -ne 0 ]]; then
  echo 'Run this command as root with sudo.' >&2
  exit 1
fi
if [[ -z ${KEEP_ADMIN_EMAIL:-} ]]; then
  echo 'KEEP_ADMIN_EMAIL_REQUIRED' >&2
  exit 2
fi

release=$(readlink -e /opt/elsadatrealestate/current)
if [[ $release != /opt/elsadatrealestate/releases/* || ! -f $release/apps/api/dist/modules/database/production-launch.js ]]; then
  echo 'PRODUCTION_LAUNCH_ACTIVE_RELEASE_INVALID' >&2
  exit 1
fi
source "$release/deploy/native/deployment-lock.sh"

services_stopped=false
restore_services() {
  local status=$?
  trap - EXIT HUP INT TERM
  if [[ $services_stopped == true ]]; then
    systemctl start elsadat-api.service elsadat-web.service || status=1
  fi
  exit "$status"
}
trap restore_services EXIT
trap 'exit 130' INT
trap 'exit 143' HUP TERM

# An expired transient timer is absent from this list and requires no stop.
resume_timers=$(systemctl list-units --all --type=timer --plain --no-legend 'elsadat-launch-resume-*.timer')
while read -r unit _; do
  [[ -n $unit ]] || continue
  if [[ ! $unit =~ ^elsadat-launch-resume-[0-9]+\.timer$ ]]; then
    echo 'PRODUCTION_LAUNCH_RESUME_TIMER_INVALID' >&2
    exit 1
  fi
  if ! systemctl stop "$unit"; then
    [[ $(systemctl show --property=LoadState --value "$unit") == not-found ]] || exit 1
  fi
done <<< "$resume_timers"

launch_admin_email=$KEEP_ADMIN_EMAIL
production_env_file=${PRODUCTION_ENV_FILE:-/etc/elsadatrealestate/production.env}
set -a
source "$production_env_file"
set +a
export PRODUCTION_ENV_FILE=$production_env_file
export KEEP_ADMIN_EMAIL=$launch_admin_email

# Set the flag first so partial stop failures also restore both services.
services_stopped=true
systemctl stop elsadat-api.service elsadat-web.service

backup_output=$(runuser -u elsadat --preserve-environment -- bash "$release/deploy/native/backup.sh")
printf '%s\n' "$backup_output"
backup_dir=$(sed -n 's/^NATIVE_BACKUP_OK path=\([^ ]*\) .*/\1/p' <<< "$backup_output")
if [[ -z $backup_dir ]]; then
  echo 'PRODUCTION_LAUNCH_BACKUP_PATH_MISSING' >&2
  exit 1
fi
export PRODUCTION_LAUNCH_BACKUP_DIR=$backup_dir

preview_file=$(mktemp /root/sadat-launch-review.XXXXXX.json)
sudo -u elsadat env \
  PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" KEEP_ADMIN_EMAIL="$KEEP_ADMIN_EMAIL" \
  npm --prefix "$release" run production:launch:plan > "$preview_file"

node - "$preview_file" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
const p = JSON.parse(raw.slice(raw.indexOf('{')));
if (!/^[a-f0-9]{64}$/.test(p.previewHash) || !p.keptAdminId ||
    !Array.isArray(p.candidates) || !Array.isArray(p.collections) ||
    p.candidates.some(x => x.collection === 'users' && x.id === p.keptAdminId)) {
  throw new Error('PRODUCTION_LAUNCH_REVIEW_INVALID');
}
fs.writeFileSync(file, JSON.stringify(p, null, 2) + '\n');
console.log('KEEP_ADMIN_EMAIL=' + process.env.KEEP_ADMIN_EMAIL);
console.log('KEEP_ADMIN_ID=' + p.keptAdminId);
console.log('PREVIEW_SHA256=' + p.previewHash);
console.log('TOTAL_CANDIDATES=' + p.candidates.length);
console.table(p.collections.filter(x => x.candidates > 0).map(x => ({
  collection: x.collection, before: x.before, delete: x.candidates
})));
NODE
printf 'Full reviewed list: %s\n' "$preview_file"
printf 'Keep the displayed admin and site settings; delete the listed trial accounts and content.\n'
printf 'After reviewing the list, type DELETE_TRIAL_DATA within 5 minutes, or press Enter to cancel: '
if ! read -r -t 300 confirmation || [[ $confirmation != DELETE_TRIAL_DATA ]]; then
  echo 'PRODUCTION_LAUNCH_CANCELLED no_data_deleted=true'
  exit 1
fi

export PRODUCTION_LAUNCH_PREVIEW_SHA256
PRODUCTION_LAUNCH_PREVIEW_SHA256=$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).previewHash' "$preview_file")
export PRODUCTION_LAUNCH_CONFIRM=PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN
sudo -u elsadat env \
  PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" KEEP_ADMIN_EMAIL="$KEEP_ADMIN_EMAIL" \
  PRODUCTION_LAUNCH_BACKUP_DIR="$PRODUCTION_LAUNCH_BACKUP_DIR" \
  PRODUCTION_LAUNCH_PREVIEW_SHA256="$PRODUCTION_LAUNCH_PREVIEW_SHA256" \
  PRODUCTION_LAUNCH_CONFIRM="$PRODUCTION_LAUNCH_CONFIRM" \
  npm --prefix "$release" run production:launch:purge -- --apply
bash "$release/deploy/native/purge-private-files.sh"

systemctl start elsadat-api.service elsadat-web.service
services_stopped=false
bash "$release/deploy/native/healthcheck.sh"
echo 'PRODUCTION_LAUNCH_DIRECT_OK admin=preserved services=healthy'
