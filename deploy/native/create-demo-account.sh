#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
exec /usr/bin/env node "$REPOSITORY_ROOT/scripts/create-production-demo-account.mjs" "${1:-}"
