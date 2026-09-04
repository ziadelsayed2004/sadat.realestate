#!/usr/bin/env bash
set -Eeuo pipefail

ATTEMPTS=${HEALTHCHECK_ATTEMPTS:-60}
INTERVAL_SECONDS=${HEALTHCHECK_INTERVAL_SECONDS:-2}

for ((attempt = 1; attempt <= ATTEMPTS; attempt += 1)); do
  if curl --fail --silent --max-time 5 http://127.0.0.1:3000/ready >/dev/null \
    && curl --fail --silent --max-time 5 http://127.0.0.1:4173/health >/dev/null; then
    echo "NATIVE_HEALTHCHECK_OK api=ready web=healthy attempt=$attempt"
    exit 0
  fi

  if (( attempt < ATTEMPTS )); then
    sleep "$INTERVAL_SECONDS"
  fi
done

echo "NATIVE_HEALTHCHECK_FAILED attempts=$ATTEMPTS" >&2
exit 1
