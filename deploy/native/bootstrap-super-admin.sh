#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PRODUCTION_ENV_FILE=${PRODUCTION_ENV_FILE:-/etc/elsadatrealestate/production.env}
CURRENT_RELEASE_LINK=${CURRENT_RELEASE:-/opt/elsadatrealestate/current}
if ! CURRENT_RELEASE=$(readlink -e "$CURRENT_RELEASE_LINK"); then
  echo 'CURRENT_RELEASE_NOT_RESOLVABLE' >&2
  exit 1
fi
BOOTSTRAP_RUNNER="$CURRENT_RELEASE/apps/api/dist/modules/admin/run-bootstrap.js"

cleanup() {
  unset ADMIN_BOOTSTRAP_EMAIL ADMIN_BOOTSTRAP_PASSWORD \
    ADMIN_BOOTSTRAP_CONFIRMATION ADMIN_BOOTSTRAP_LOCALE
}
trap cleanup EXIT

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this script as root with sudo.' >&2
  exit 1
fi
if [[ ! -r "$PRODUCTION_ENV_FILE" ]]; then
  echo 'PRODUCTION_ENV_FILE_NOT_READABLE' >&2
  exit 1
fi
if [[ ! -f "$BOOTSTRAP_RUNNER" ]]; then
  echo 'ADMIN_BOOTSTRAP_RUNNER_MISSING_DEPLOY_CURRENT_RELEASE_FIRST' >&2
  exit 1
fi
if ! id -u elsadat >/dev/null 2>&1; then
  echo 'ELSADAT_SERVICE_ACCOUNT_MISSING' >&2
  exit 1
fi

read -r -p 'Super Admin email: ' ADMIN_BOOTSTRAP_EMAIL
read -rs -p 'Super Admin password (8-128; upper, lower, number, symbol): ' ADMIN_BOOTSTRAP_PASSWORD
printf '\n'
read -rs -p 'Repeat Super Admin password: ' ADMIN_BOOTSTRAP_PASSWORD_CONFIRM
printf '\n'

if [[ -z "$ADMIN_BOOTSTRAP_EMAIL" || -z "$ADMIN_BOOTSTRAP_PASSWORD" ]]; then
  echo 'ADMIN_BOOTSTRAP_CREDENTIALS_REQUIRED' >&2
  exit 2
fi
if [[ "$ADMIN_BOOTSTRAP_PASSWORD" != "$ADMIN_BOOTSTRAP_PASSWORD_CONFIRM" ]]; then
  echo 'ADMIN_BOOTSTRAP_PASSWORDS_DO_NOT_MATCH' >&2
  exit 2
fi
unset ADMIN_BOOTSTRAP_PASSWORD_CONFIRM

# shellcheck disable=SC1090
set -a
source "$PRODUCTION_ENV_FILE"
set +a
export ADMIN_BOOTSTRAP_EMAIL ADMIN_BOOTSTRAP_PASSWORD
export ADMIN_BOOTSTRAP_CONFIRMATION=CREATE_FIRST_SUPER_ADMIN
export ADMIN_BOOTSTRAP_LOCALE=ar

if ! bootstrap_output=$(runuser -u elsadat --preserve-environment -- \
  /usr/bin/node "$BOOTSTRAP_RUNNER"); then
  echo 'SUPER_ADMIN_BOOTSTRAP_FAILED See the safe error above; no password was logged.' >&2
  exit 1
fi
printf '%s\n' "$bootstrap_output"

case "$bootstrap_output" in
  ADMIN_BOOTSTRAP_OK*)
    echo 'SUPER_ADMIN_READY login=https://elsadatrealestate.com/auth/login?lang=ar'
    ;;
  ADMIN_BOOTSTRAP_ALREADY_COMPLETED)
    echo 'SUPER_ADMIN_BOOTSTRAP_ALREADY_COMPLETED The entered credentials were not applied; use password recovery for the original account.'
    ;;
  *)
    echo 'SUPER_ADMIN_BOOTSTRAP_UNEXPECTED_RESULT' >&2
    exit 1
    ;;
esac
