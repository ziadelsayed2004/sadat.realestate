#!/usr/bin/env bash
set -Eeuo pipefail

curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/ready >/dev/null
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:4173/health >/dev/null

echo "NATIVE_HEALTHCHECK_OK api=ready web=healthy"
