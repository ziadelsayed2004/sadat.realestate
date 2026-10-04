import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';

test('failed release cleanup and disk recovery preserve the active release', () => {
  const temporaryRoot = path.join(root, '.tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(temporaryRoot, 'deployment-shell-'));
  try {
    for (const file of ['deploy-release.sh', 'check-disk-space.sh', 'recover-disk-space.sh']) {
      const script = fs.readFileSync(path.join(root, 'deploy/native', file), 'utf8');
      // Exercise the actual scripts with only their fixed server root redirected.
      fs.writeFileSync(path.join(sandbox, file), script.replaceAll('/opt/elsadatrealestate', '${SANDBOX}'));
    }
    const fixture = `set -Eeuo pipefail
SANDBOX=$(mktemp -d)
export SANDBOX
trap '[[ "$SANDBOX" == /tmp/* ]] && rm -rf -- "$SANDBOX"' EXIT
FIXTURE=$1
mkdir -p "$SANDBOX/bin" "$SANDBOX/releases/previous" "$SANDBOX/source/deploy/native"
touch "$SANDBOX/releases/previous/runtime.txt" "$SANDBOX/source/package-lock.json"
cp "$FIXTURE/check-disk-space.sh" "$SANDBOX/source/deploy/native/"
ln -s "$SANDBOX/releases/previous" "$SANDBOX/current"
printf '#!/usr/bin/env bash\nif [[ $1 == -u ]]; then echo 0; else echo elsadat; fi\n' > "$SANDBOX/bin/id"
printf '#!/usr/bin/env bash\necho 20261004T152254Z\n' > "$SANDBOX/bin/date"
printf '#!/usr/bin/env bash\necho "Filesystem 1024-blocks Used Available Capacity Mounted"\necho "fixture 9000000 1000000 8000000 12%% /"\n' > "$SANDBOX/bin/df"
printf '#!/usr/bin/env bash\nexit 11\n' > "$SANDBOX/bin/rsync"
chmod +x "$SANDBOX/bin/"*
export PATH="$SANDBOX/bin:$PATH"
set +e
bash "$FIXTURE/deploy-release.sh" "$SANDBOX/source"
STATUS=$?
set -e
[[ $STATUS == 11 ]]
[[ ! -e "$SANDBOX/releases/20261004T152254Z" ]]
[[ -f "$SANDBOX/current/runtime.txt" ]]

# A failure after selecting the new release must retain that active directory.
printf '#!/usr/bin/env bash\nln -sfn "$SANDBOX/releases/20261004T152254Z" "$SANDBOX/current"\nexit 11\n' > "$SANDBOX/bin/rsync"
set +e
bash "$FIXTURE/deploy-release.sh" "$SANDBOX/source"
STATUS=$?
set -e
[[ $STATUS == 11 && -d "$SANDBOX/current" ]]
touch "$SANDBOX/current/runtime.txt"
mkdir -p "$SANDBOX/releases/20261004T152255Z" "$SANDBOX/current/docs/quality/screens" "$SANDBOX/staging/reviewed-source/docs/quality" "$SANDBOX/private" "$SANDBOX/backups"
touch "$SANDBOX/private/upload.txt" "$SANDBOX/backups/database.archive"
set +e
bash "$FIXTURE/recover-disk-space.sh" 20261004T152254Z
STATUS=$?
set -e
[[ $STATUS != 0 && -f "$SANDBOX/current/runtime.txt" ]]
bash "$FIXTURE/recover-disk-space.sh" 20261004T152255Z
[[ ! -e "$SANDBOX/releases/20261004T152255Z" ]]
[[ ! -e "$SANDBOX/current/docs/quality" ]]
[[ -f "$SANDBOX/current/runtime.txt" && -f "$SANDBOX/private/upload.txt" && -f "$SANDBOX/backups/database.archive" ]]

# Low space is rejected before any release directory can be created.
printf '#!/usr/bin/env bash\necho "Filesystem 1024-blocks Used Available Capacity Mounted"\necho "fixture 9000000 8999999 1 99%% /"\n' > "$SANDBOX/bin/df"
set +e
bash "$FIXTURE/check-disk-space.sh"
STATUS=$?
set -e
[[ $STATUS != 0 ]]
echo DEPLOYMENT_RECOVERY_FIXTURE_OK
`;
    fs.writeFileSync(path.join(sandbox, 'fixture.sh'), fixture);
    const result = spawnSync(bash, [path.join(sandbox, 'fixture.sh').replaceAll('\\', '/'), sandbox.replaceAll('\\', '/')], { encoding: 'utf8', windowsHide: true, env: { ...process.env, MSYS: 'winsymlinks:nativestrict' } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error?.message ?? ''}`);
    assert.match(result.stdout, /DEPLOYMENT_RECOVERY_FIXTURE_OK/u);
  } finally {
    assert.equal(path.dirname(sandbox), temporaryRoot);
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
