#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

REPOSITORY_URL=${REPOSITORY_URL:-https://github.com/ziadelsayed2004/sadat.realestate.git}
RELEASE_REF=${RELEASE_REF:-main}

if [[ $(id -un) != 'elsadat' ]]; then
  echo 'Run this deployment as the elsadat service user.' >&2
  exit 1
fi
if [[ ! "$REPOSITORY_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\.git$ ]]; then
  echo 'REPOSITORY_URL must be an HTTPS GitHub repository URL.' >&2
  exit 1
fi
if [[ ! "$RELEASE_REF" =~ ^[A-Za-z0-9._/-]+$ || "$RELEASE_REF" == -* || "$RELEASE_REF" == *..* ]]; then
  echo 'RELEASE_REF is invalid.' >&2
  exit 1
fi

SOURCE_DIR=$(mktemp -d /opt/elsadatrealestate/staging/github.XXXXXX)
cleanup() { rm -rf -- "$SOURCE_DIR"; }
trap cleanup EXIT

git clone --filter=blob:none --no-tags --depth 1 --branch "$RELEASE_REF" "$REPOSITORY_URL" "$SOURCE_DIR"
git -C "$SOURCE_DIR" diff --quiet
git -C "$SOURCE_DIR" diff --cached --quiet

EXTERNAL_SMOKE_BASE_URL=${EXTERNAL_SMOKE_BASE_URL:-} \
  bash "$SOURCE_DIR/deploy/native/deploy-release.sh" "$SOURCE_DIR"
