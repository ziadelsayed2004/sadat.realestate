#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

REPOSITORY=${OPERATOR_REPOSITORY:-/root/sadat-release}
RELEASE_REF=${RELEASE_REF:-main}

if [[ ! -d "$REPOSITORY/.git" || ! -f "$REPOSITORY/package-lock.json" ]]; then
  echo 'OPERATOR_REPOSITORY_INVALID' >&2
  exit 1
fi

cd "$REPOSITORY"
git pull --ff-only origin "$RELEASE_REF"
REVISION=$(git rev-parse --short HEAD)
echo "SADAT_RELEASE_REVISION=$REVISION"

# The demo installer is deliberately idempotent and only upserts records marked
# as synthetic. Existing real production records are never reset or replaced.
sudo env \
  OPERATOR_REPOSITORY="$REPOSITORY" \
  RELEASE_REF="$RELEASE_REF" \
  bash "$REPOSITORY/deploy/native/manage-production.sh" demo

echo "SADAT_DEMO_RELEASE_OK revision=$REVISION"
