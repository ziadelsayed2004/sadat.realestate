#!/usr/bin/env bash
# Source this file; inherited descriptor 9 keeps nested release scripts locked.
DEPLOY_ROOT=/opt/elsadatrealestate
DEPLOY_LOCK="$DEPLOY_ROOT/.deployment.lock"
if [[ ! -d "$DEPLOY_ROOT" || -L "$DEPLOY_ROOT" || $(realpath -e "$DEPLOY_ROOT") != "$DEPLOY_ROOT" \
  || -L "$DEPLOY_LOCK" || ( -e "$DEPLOY_LOCK" && ! -f "$DEPLOY_LOCK" ) ]]; then
  echo 'DEPLOYMENT_LOCK_PATH_UNSAFE' >&2
  exit 1
fi
if [[ ! -e /proc/$$/fd/9 || ! "$DEPLOY_LOCK" -ef /proc/$$/fd/9 ]]; then
  exec 9>>"$DEPLOY_LOCK"
fi
if [[ $(id -u) -eq 0 ]]; then
  chown elsadat:elsadat "$DEPLOY_LOCK"
  chmod 0640 "$DEPLOY_LOCK"
fi
if ! flock --exclusive --nonblock 9; then
  echo 'DEPLOYMENT_ALREADY_RUNNING no_files_changed=true' >&2
  exit 1
fi
