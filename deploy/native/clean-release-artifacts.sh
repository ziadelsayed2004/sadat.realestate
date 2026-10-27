#!/usr/bin/env bash
# Remove only reproducible QA/build caches inside a verified timestamp release.
set -Eeuo pipefail
release=${1:-}
root=/opt/elsadatrealestate/releases
if [[ ${release%/*} != "$root" || ! ${release##*/} =~ ^[0-9]{8}T[0-9]{6}Z$ \
  || -L $release || ! -d $release || $(realpath -e "$root") != "$root" \
  || $(realpath -e "$release") != "$release" ]]; then
  echo 'DEPLOYMENT_ARTIFACT_RELEASE_UNSAFE no_files_removed=true' >&2
  exit 1
fi
for relative in docs/quality docs/design_sources apps/web/tests/e2e \
  apps/web/test-results apps/web/playwright-report test-results playwright-report \
  blob-report coverage apps/api/coverage apps/web/coverage .cache .turbo \
  node_modules/.cache node_modules/.vite apps/web/node_modules/.vite; do
  target="$release/$relative"
  [[ ! -e $target && ! -L $target ]] && continue
  # Any linked parent or target requires inspection; never traverse it.
  [[ ! -L $target && $(realpath -e "$target") == "$target" ]] || continue
  rm -rf -- "$target"
  echo "DEPLOYMENT_GENERATED_ARTIFACT_REMOVED release=${release##*/} path=$relative"
done
