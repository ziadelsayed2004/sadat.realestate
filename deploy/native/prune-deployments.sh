#!/usr/bin/env bash
set -Eeuo pipefail
umask 027
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=deployment-lock.sh
source "$SCRIPT_DIR/deployment-lock.sh"
ROOT=/opt/elsadatrealestate
PRESERVE_SOURCE=${1:-}
ACTIVE=''
ROLLBACK=''

# Resolve every protected pointer before removing anything. A broken or escaped
# link requires operator inspection, never a guess about which release is live.
for LINK in current previous; do
  POINTER="$ROOT/$LINK"
  if [[ -e "$POINTER" || -L "$POINTER" ]]; then
    TARGET=$(readlink -e "$POINTER" 2>/dev/null || true)
    if [[ ! -L "$POINTER" || ! -d "$TARGET" || ${TARGET%/*} != "$ROOT/releases" \
      || ! ${TARGET##*/} =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
      echo "DEPLOYMENT_POINTER_UNSAFE pointer=$LINK no_files_removed=true" >&2
      exit 1
    fi
    if [[ "$LINK" == current ]]; then ACTIVE=$TARGET; else ROLLBACK=$TARGET; fi
  fi
done
for DIRECTORY in "$ROOT/releases" "$ROOT/staging"; do
  if [[ -e "$DIRECTORY" || -L "$DIRECTORY" ]]; then
    if [[ -L "$DIRECTORY" || $(realpath -e "$DIRECTORY") != "$DIRECTORY" ]]; then
      echo 'DEPLOYMENT_DIRECTORY_UNSAFE no_files_removed=true' >&2
      exit 1
    fi
  fi
done

# Do not prune release history on a machine without a known active release.
# Legacy installations have no previous pointer: retain the newest older
# timestamp directory for rollback until the next successful deployment.
if [[ -n "$ACTIVE" ]]; then
  mapfile -t NAMES < <(find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
  if [[ -z "$ROLLBACK" || "$ROLLBACK" == "$ACTIVE" ]]; then
    for NAME in "${NAMES[@]}"; do
      [[ "$NAME" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || continue
      [[ "$NAME" < "${ACTIVE##*/}" ]] || continue
      CANDIDATE="$ROOT/releases/$NAME"
      [[ "$CANDIDATE" == "$ACTIVE" || -L "$CANDIDATE" || $(realpath -e "$CANDIDATE") != "$CANDIDATE" ]] && continue
      ROLLBACK=$CANDIDATE
      break
    done
  fi
  for NAME in "${NAMES[@]}"; do
    [[ "$NAME" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || continue
    TARGET="$ROOT/releases/$NAME"
    [[ "$TARGET" == "$ACTIVE" || "$TARGET" == "$ROLLBACK" || "$TARGET" == "$PRESERVE_SOURCE" || -L "$TARGET" ]] && continue
    [[ $(realpath -e "$TARGET") == "$TARGET" ]] || continue
    rm -rf -- "$TARGET"
    echo "DEPLOYMENT_OLD_RELEASE_REMOVED release=$NAME"
  done
fi

# The deployment lock guarantees these clones are not another running build.
# Keep the current caller's source until its checks and release copy finish.
for TARGET in "$ROOT"/staging/github.* "$ROOT"/staging/reviewed.* "$ROOT/staging/reviewed-source"; do
  [[ -d "$TARGET" && ! -L "$TARGET" ]] || continue
  [[ ${TARGET##*/} =~ ^(github|reviewed)\.[A-Za-z0-9]{6}$ || ${TARGET##*/} == reviewed-source ]] || continue
  [[ $(realpath -e "$TARGET") == "$TARGET" && "$TARGET" != "$PRESERVE_SOURCE" ]] || continue
  rm -rf -- "$TARGET"
  echo "DEPLOYMENT_STALE_SOURCE_REMOVED source=${TARGET##*/}"
done
# Historical active/rollback releases may predate automatic artifact cleanup.
for TARGET in "$ACTIVE" "$ROLLBACK"; do
  [[ -n "$TARGET" && -d "$TARGET" && ! -L "$TARGET" ]] || continue
  bash "$SCRIPT_DIR/clean-release-artifacts.sh" "$TARGET"
done

echo 'DEPLOYMENT_PRUNE_OK current_and_rollback=preserved database_uploads_backups=untouched'
