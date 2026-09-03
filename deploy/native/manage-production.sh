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
Usage: sudo bash deploy/native/manage-production.sh <demo|update|empty>
  demo   Deploy the latest release and install the complete synthetic client demo.
  update Deploy the latest release without changing any database records.
  empty  Deploy the latest release and remove synthetic demo records only.
EOF
}

if [[ $(id -u) -ne 0 ]]; then
  echo 'Run this command as root with sudo.' >&2
  exit 1
fi
if [[ "$MODE" != demo && "$MODE" != update && "$MODE" != empty ]]; then
  usage >&2
  exit 2
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

case "$MODE" in
  demo)
    sudo -u elsadat env \
      PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
      PRODUCTION_DEMO_CONFIRM=INSTALL_FULL_LOCAL_DEMO \
      npm --prefix /opt/elsadatrealestate/current run production:demo:seed
    ;;
  empty)
    sudo -u elsadat env \
      PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
      PRODUCTION_DEMO_RESET_CONFIRM=DELETE_SYNTHETIC_DEMO_DATA \
      npm --prefix /opt/elsadatrealestate/current run production:demo:reset
    ;;
  update) ;;
esac

systemctl restart elsadat-api.service elsadat-web.service
bash /opt/elsadatrealestate/current/deploy/native/healthcheck.sh
curl --fail --silent --show-error --max-time 15 "$PUBLIC_ORIGIN/" >/dev/null
curl --fail --silent --show-error --max-time 15 "$PUBLIC_ORIGIN/api/v1/public/home" >/dev/null

echo "PRODUCTION_MANAGE_OK mode=$MODE data=$([[ $MODE == demo ]] && echo synthetic_demo_installed || ([[ $MODE == empty ]] && echo synthetic_demo_removed_real_data_preserved || echo preserved))"
