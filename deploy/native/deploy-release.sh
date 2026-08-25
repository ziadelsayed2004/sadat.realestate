#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

SOURCE_DIR=${1:-}
if [[ -z "$SOURCE_DIR" || ! -f "$SOURCE_DIR/package-lock.json" ]]; then
  echo 'Usage: deploy-release.sh /absolute/path/to/reviewed-source' >&2
  exit 1
fi
if [[ $(id -un) != 'elsadat' ]]; then
  echo 'Run this release script as the elsadat service user.' >&2
  exit 1
fi

RELEASE_ID=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE_DIR="/opt/elsadatrealestate/releases/$RELEASE_ID"
CURRENT_LINK=/opt/elsadatrealestate/current
PREVIOUS=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)
mkdir -p "$RELEASE_DIR"
rsync -a --delete \
  --exclude node_modules --exclude .git --exclude .local --exclude '.env*' \
  "$SOURCE_DIR/" "$RELEASE_DIR/"

cd "$RELEASE_DIR"
npm ci
npm run typecheck
npm run lint
npm test
npm run build
PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env npm run production:config

ln -sfn "$RELEASE_DIR" /opt/elsadatrealestate/current.next
mv -Tf /opt/elsadatrealestate/current.next "$CURRENT_LINK"
sudo systemctl restart elsadat-api.service elsadat-web.service

READY=false
for _ in {1..60}; do
  if curl --fail --silent --max-time 5 http://127.0.0.1:3000/ready >/dev/null \
    && curl --fail --silent --max-time 5 http://127.0.0.1:4173/health >/dev/null; then
    READY=true
    break
  fi
  sleep 2
done

if [[ $READY != true ]]; then
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" /opt/elsadatrealestate/current.rollback
    mv -Tf /opt/elsadatrealestate/current.rollback "$CURRENT_LINK"
    sudo systemctl restart elsadat-api.service elsadat-web.service
  fi
  echo 'DEPLOYMENT_FAILED_AND_ROLLED_BACK' >&2
  exit 1
fi

if [[ -n ${EXTERNAL_SMOKE_BASE_URL:-} ]]; then
  curl --fail --silent --show-error --max-time 15 "${EXTERNAL_SMOKE_BASE_URL%/}/health" >/dev/null
  EXTERNAL_SMOKE=passed
else
  EXTERNAL_SMOKE=deferred
fi
echo "NATIVE_RELEASE_READY release=$RELEASE_ID external_smoke=$EXTERNAL_SMOKE"
