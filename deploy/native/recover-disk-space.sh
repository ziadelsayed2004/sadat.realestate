#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

if [[ $(id -u) -ne 0 ]]; then
  echo 'Run this recovery as root.' >&2
  exit 1
fi
FAILED_ID=${1:-}
ROOT=/opt/elsadatrealestate
ACTIVE=$(readlink -e "$ROOT/current" 2>/dev/null || true)
if [[ -n "$FAILED_ID" ]]; then
  if [[ ! "$FAILED_ID" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
    echo 'FAILED_RELEASE_ID_INVALID' >&2
    exit 1
  fi
  FAILED="$ROOT/releases/$FAILED_ID"
  if [[ -L "$FAILED" || $(realpath -m "$FAILED") != "$FAILED" || "$ACTIVE" == "$FAILED" ]]; then
    echo 'REFUSING_TO_REMOVE_ACTIVE_OR_UNSAFE_RELEASE' >&2
    exit 1
  fi
  rm -rf -- "$FAILED"
  echo "FAILED_RELEASE_REMOVED release=$FAILED_ID"
fi

# These are generated QA artifacts, never application uploads or database files.
for DIRECTORY in "$ROOT/staging/reviewed-source" "$ROOT"/releases/*; do
  [[ -d "$DIRECTORY" && ! -L "$DIRECTORY" ]] || continue
  case "$DIRECTORY" in
    "$ROOT/staging/reviewed-source") ;;
    "$ROOT"/releases/*)
      [[ ${DIRECTORY##*/} =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || continue
      ;;
    *) continue ;;
  esac
  TARGET="$DIRECTORY/docs/quality"
  [[ $(realpath -m "$TARGET") == "$TARGET" ]] || continue
  if [[ -d "$TARGET" ]]; then
    rm -rf -- "$TARGET"
    echo "DEPLOYMENT_QA_ARTIFACTS_REMOVED path=$TARGET"
  fi
done
df -h "$ROOT"
df -i "$ROOT"
