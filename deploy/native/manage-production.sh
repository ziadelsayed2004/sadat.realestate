#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

MODE=${1:-}
OPERATOR_REPOSITORY=${OPERATOR_REPOSITORY:-/root/sadat-release}
STAGED_SOURCE=/opt/elsadatrealestate/staging/reviewed-source
PRODUCTION_ENV_FILE=${PRODUCTION_ENV_FILE:-/etc/elsadatrealestate/production.env}
RELEASE_REF=${RELEASE_REF:-main}
PUBLIC_ORIGIN=${PUBLIC_ORIGIN:-https://elsadatrealestate.com}

usage() {
  cat <<'EOF'
Usage: sudo bash deploy/native/manage-production.sh <update|empty|launch>
  update Deploy the latest release without changing any database records.
  empty  Deploy the latest release and remove synthetic demo records only.
  launch Deploy, back up, then purge all business data and accounts except KEEP_ADMIN_EMAIL.
EOF
}

if [[ $(id -u) -ne 0 ]]; then
  echo 'Run this command as root with sudo.' >&2
  exit 1
fi
if [[ "$MODE" != demo && "$MODE" != update && "$MODE" != empty && "$MODE" != launch ]]; then
  usage >&2
  exit 2
fi
if [[ "$MODE" == demo ]]; then
  echo 'PRODUCTION_DEMO_DISABLED' >&2
  exit 2
fi
if [[ "$MODE" == launch ]]; then
  if [[ -z ${KEEP_ADMIN_EMAIL:-} ]]; then
    echo 'KEEP_ADMIN_EMAIL_REQUIRED' >&2
    exit 2
  fi
  if [[ ${PRODUCTION_LAUNCH_CONFIRM:-} != PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN ]]; then
    echo 'PRODUCTION_LAUNCH_CONFIRMATION_REQUIRED' >&2
    exit 2
  fi
fi
if [[ ! -d "$OPERATOR_REPOSITORY/.git" || ! -f "$OPERATOR_REPOSITORY/package-lock.json" ]]; then
  echo 'OPERATOR_REPOSITORY_INVALID' >&2
  exit 1
fi
if [[ ! -f "$PRODUCTION_ENV_FILE" ]]; then
  echo 'PRODUCTION_ENV_FILE_MISSING' >&2
  exit 1
fi

echo "PRODUCTION_MANAGE_START mode=$MODE ref=$RELEASE_REF"
git -C "$OPERATOR_REPOSITORY" pull --ff-only origin "$RELEASE_REF"

PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
PRODUCTION_MONGODB_URI_REPAIR_CONFIRM=REBUILD_MONGODB_URI_FROM_APP_CREDENTIALS \
  node "$OPERATOR_REPOSITORY/scripts/repair-production-mongodb-uri.mjs"
chown root:elsadat "$PRODUCTION_ENV_FILE"
chmod 0640 "$PRODUCTION_ENV_FILE"

PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
  node "$OPERATOR_REPOSITORY/scripts/production-preflight.mjs"

install -d -o elsadat -g elsadat -m 0750 "$STAGED_SOURCE"
rsync -a --delete \
  --exclude='.env*' \
  --exclude='.git' \
  --exclude='node_modules' \
  "$OPERATOR_REPOSITORY/" "$STAGED_SOURCE/"
chown -R elsadat:elsadat "$STAGED_SOURCE"

sudo -u elsadat env \
  RELEASE_REF="$RELEASE_REF" \
  EXTERNAL_SMOKE_BASE_URL="$PUBLIC_ORIGIN" \
  bash "$STAGED_SOURCE/deploy/native/deploy-from-github.sh"

services_stopped=false
restart_on_failure() {
  if [[ "$services_stopped" == true ]]; then
    systemctl restart elsadat-api.service elsadat-web.service || true
  fi
}
trap restart_on_failure EXIT

case "$MODE" in
  empty)
    sudo -u elsadat env \
      PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
      PRODUCTION_DEMO_RESET_CONFIRM=DELETE_SYNTHETIC_DEMO_DATA \
      npm --prefix /opt/elsadatrealestate/current run production:demo:reset
    ;;
  launch)
    if [[ -z ${KEEP_ADMIN_EMAIL:-} ]]; then
      echo 'KEEP_ADMIN_EMAIL_REQUIRED' >&2
      exit 2
    fi
    launch_admin_email=$KEEP_ADMIN_EMAIL
    systemctl stop elsadat-api.service elsadat-web.service
    services_stopped=true
    # shellcheck disable=SC1090
    set -a
    source "$PRODUCTION_ENV_FILE"
    set +a
    KEEP_ADMIN_EMAIL=$launch_admin_email
    export KEEP_ADMIN_EMAIL
    backup_output=$(runuser -u elsadat --preserve-environment -- \
      bash /opt/elsadatrealestate/current/deploy/native/backup.sh)
    printf '%s\n' "$backup_output"
    backup_dir=$(sed -n 's/^NATIVE_BACKUP_OK path=\([^ ]*\) .*/\1/p' <<<"$backup_output")
    if [[ -z "$backup_dir" ]]; then
      echo 'PRODUCTION_LAUNCH_BACKUP_PATH_MISSING' >&2
      exit 1
    fi
    sudo -u elsadat env \
      PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
      KEEP_ADMIN_EMAIL="$KEEP_ADMIN_EMAIL" \
      npm --prefix /opt/elsadatrealestate/current run production:launch:plan
    sudo -u elsadat env \
      PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
      KEEP_ADMIN_EMAIL="$KEEP_ADMIN_EMAIL" \
      PRODUCTION_LAUNCH_BACKUP_DIR="$backup_dir" \
      PRODUCTION_LAUNCH_CONFIRM=PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN \
      npm --prefix /opt/elsadatrealestate/current run production:launch:purge
    PRODUCTION_LAUNCH_BACKUP_DIR="$backup_dir" \
      PRODUCTION_LAUNCH_CONFIRM=PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN \
      bash /opt/elsadatrealestate/current/deploy/native/purge-private-files.sh
    ;;
  update) ;;
esac

systemctl restart elsadat-api.service elsadat-web.service
services_stopped=false
bash /opt/elsadatrealestate/current/deploy/native/healthcheck.sh
curl --fail --silent --show-error --max-time 15 "$PUBLIC_ORIGIN/" >/dev/null
curl --fail --silent --show-error --max-time 15 "$PUBLIC_ORIGIN/api/v1/public/home" >/dev/null

echo "PRODUCTION_MANAGE_OK mode=$MODE data=$([[ $MODE == demo ]] && echo synthetic_demo_installed_real_data_preserved || ([[ $MODE == launch ]] && echo real_launch_admin_only || ([[ $MODE == empty ]] && echo synthetic_demo_removed_real_data_preserved || echo preserved)))"
