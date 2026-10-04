#!/usr/bin/env bash
set -Eeuo pipefail

MIN_FREE_MB=${DEPLOY_MIN_FREE_MB:-3072}
if [[ ! "$MIN_FREE_MB" =~ ^[1-9][0-9]{0,5}$ ]]; then
  echo 'DEPLOY_MIN_FREE_MB_INVALID' >&2
  exit 1
fi
AVAILABLE_KB=$(df -Pk /opt/elsadatrealestate | awk 'NR == 2 { print $4 }')
if [[ ! "$AVAILABLE_KB" =~ ^[0-9]+$ ]] || (( AVAILABLE_KB < MIN_FREE_MB * 1024 )); then
  echo "DEPLOYMENT_DISK_SPACE_REQUIRED minimum_mb=$MIN_FREE_MB available_kb=$AVAILABLE_KB current_release_unchanged=true" >&2
  exit 1
fi
