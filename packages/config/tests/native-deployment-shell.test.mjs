import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';

test('reviewed launch handles expired timers, pins the active release and restores services on cancellation or failure', () => {
  const temporaryRoot = path.join(root, '.tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(temporaryRoot, 'launch-reviewed-'));
  try {
    const script = fs.readFileSync(path.join(root, 'deploy/native/launch-reviewed.sh'), 'utf8')
      .replaceAll('/opt/elsadatrealestate', '${SANDBOX}')
      .replaceAll('/root/sadat-launch-review.', '${SANDBOX}/sad-launch-review.')
      .replace('if [[ $EUID -ne 0 ]]; then', 'if false; then');
    fs.writeFileSync(path.join(sandbox, 'launch.sh'), script);
    fs.writeFileSync(path.join(sandbox, 'fixture.sh'), String.raw`set -Eeuo pipefail
cd "$1"
export SANDBOX=$PWD
mkdir -p "$SANDBOX/bin" "$SANDBOX/releases/fixture/deploy/native" "$SANDBOX/releases/fixture/apps/api/dist/modules/database"
ln -s "$SANDBOX/releases/fixture" "$SANDBOX/current"
touch "$SANDBOX/releases/fixture/apps/api/dist/modules/database/production-launch.js"
printf 'echo LOCK >> "$SANDBOX/events"\n' > "$SANDBOX/current/deploy/native/deployment-lock.sh"
printf 'echo BACKUP >> "$SANDBOX/events"\n[[ $FAIL_BACKUP != true ]] || exit 12\necho "NATIVE_BACKUP_OK path=$SANDBOX/backup off_server_copy_required=true"\n' > "$SANDBOX/current/deploy/native/backup.sh"
printf 'echo FILES >> "$SANDBOX/events"\n' > "$SANDBOX/current/deploy/native/purge-private-files.sh"
printf 'echo HEALTH >> "$SANDBOX/events"\n' > "$SANDBOX/current/deploy/native/healthcheck.sh"
printf 'APP_ENV=production\nKEEP_ADMIN_EMAIL=wrong@example.invalid\n' > "$SANDBOX/production.env"
cat > "$SANDBOX/bin/systemctl" <<'CONTROL'
#!/usr/bin/env bash
echo "SYSTEMCTL $*" >> "$SANDBOX/events"
if [[ $1 == list-units && $ACTIVE_TIMER == true ]]; then
  echo 'elsadat-launch-resume-123.timer loaded active waiting resume'
fi
exit 0
CONTROL
cat > "$SANDBOX/bin/sudo" <<'SUDO'
#!/usr/bin/env bash
shift 2
exec "$@"
SUDO
cat > "$SANDBOX/bin/runuser" <<'USER'
#!/usr/bin/env bash
while [[ $1 != -- ]]; do shift; done
shift
exec "$@"
USER
cat > "$SANDBOX/bin/npm" <<'NPM'
#!/usr/bin/env bash
set -Eeuo pipefail
[[ $KEEP_ADMIN_EMAIL == root@example.invalid ]]
[[ $2 == "$SANDBOX/releases/fixture" ]]
if [[ $* == *production:launch:plan* ]]; then
  echo PLAN >> "$SANDBOX/events"
  cat "$SANDBOX/preview.json"
else
  echo APPLY >> "$SANDBOX/events"
  [[ $PRODUCTION_LAUNCH_PREVIEW_SHA256 == $(printf 'a%.0s' {1..64}) ]]
  [[ $PRODUCTION_LAUNCH_BACKUP_DIR == "$SANDBOX/backup" ]]
  [[ $PRODUCTION_LAUNCH_CONFIRM == PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN ]]
  [[ $FAIL_APPLY != true ]] || exit 13
fi
NPM
chmod +x "$SANDBOX/bin/"*
export PATH="$SANDBOX/bin:$PATH"
export KEEP_ADMIN_EMAIL=root@example.invalid PRODUCTION_ENV_FILE="$SANDBOX/production.env"
export ACTIVE_TIMER=false FAIL_BACKUP=false FAIL_APPLY=false
printf '{"keptAdminId":"root","previewHash":"%s","collections":[{"collection":"users","before":2,"candidates":1}],"candidates":[{"collection":"users","id":"trial"}]}' "$(printf 'a%.0s' {1..64})" > "$SANDBOX/preview.json"

printf 'DELETE_TRIAL_DATA\n' | bash "$SANDBOX/launch.sh"
[[ $(grep -c '^APPLY$' "$SANDBOX/events") == 1 ]]
[[ $(tail -n 1 "$SANDBOX/events") == HEALTH ]]
! grep -q 'SYSTEMCTL stop elsadat-launch-resume-' "$SANDBOX/events"

for scenario in cancel backup apply; do
  : > "$SANDBOX/events"
  export ACTIVE_TIMER=true FAIL_BACKUP=false FAIL_APPLY=false
  answer=DELETE_TRIAL_DATA
  if [[ $scenario == cancel ]]; then answer=CANCEL; fi
  if [[ $scenario == backup ]]; then export FAIL_BACKUP=true; fi
  if [[ $scenario == apply ]]; then export FAIL_APPLY=true; fi
  if printf '%s\n' "$answer" | bash "$SANDBOX/launch.sh"; then exit 71; fi
  [[ $(tail -n 1 "$SANDBOX/events") == 'SYSTEMCTL start elsadat-api.service elsadat-web.service' ]]
  grep -q 'SYSTEMCTL stop elsadat-launch-resume-123.timer' "$SANDBOX/events"
  ! grep -q '^FILES$' "$SANDBOX/events"
  if [[ $scenario != apply ]]; then ! grep -q '^APPLY$' "$SANDBOX/events"; fi
done
echo REVIEWED_LAUNCH_FIXTURE_OK
`);
    const result = spawnSync(bash, [path.join(sandbox, 'fixture.sh').replaceAll('\\', '/'), sandbox.replaceAll('\\', '/')], { encoding: 'utf8', windowsHide: true, env: { ...process.env, MSYS: 'winsymlinks:nativestrict' } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error?.message ?? ''}`);
    assert.match(result.stdout, /REVIEWED_LAUNCH_FIXTURE_OK/u);
  } finally {
    assert.equal(path.dirname(sandbox), temporaryRoot);
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('native backup writes portable checksums and detects changed archive bytes', () => {
  const temporaryRoot = path.join(root, '.tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(temporaryRoot, 'backup-checksum-'));
  try {
    const script = fs.readFileSync(path.join(root, 'deploy/native/backup.sh'), 'utf8');
    fs.writeFileSync(path.join(sandbox, 'backup.sh'), script.replaceAll('/var/lib/elsadatrealestate', '${SANDBOX}/storage'));
    fs.writeFileSync(path.join(sandbox, 'fixture.sh'), String.raw`set -Eeuo pipefail
cd "$1"
export SANDBOX=$PWD
mkdir -p "$SANDBOX/bin" "$SANDBOX/storage/private"
printf 'retained upload' > "$SANDBOX/storage/private/photo.webp"
cat > "$SANDBOX/bin/mongodump" <<'DUMP'
#!/usr/bin/env bash
set -Eeuo pipefail
for argument in "$@"; do
  if [[ $argument == --archive=* ]]; then
    archive=$(printf '%s' "$argument" | cut -c11-)
    printf 'database fixture' > "$archive"
  fi
done
DUMP
chmod +x "$SANDBOX/bin/mongodump"
export PATH="$SANDBOX/bin:$PATH"
export BACKUP_ROOT="$SANDBOX/backups with spaces"
export MONGODB_URI=mongodb://fixture.invalid/unused
bash "$SANDBOX/backup.sh"
for backup in "$BACKUP_ROOT/"*; do
  cd "$backup"
  sha256sum --check --status SHA256SUMS
  [[ $(wc -l < SHA256SUMS) == 2 ]]
  grep -Eq '^[a-f0-9]{64} [ *]mongodb.archive.gz$' SHA256SUMS
  grep -Eq '^[a-f0-9]{64} [ *]private-files.tar.gz$' SHA256SUMS
  tar -tzf private-files.tar.gz | grep -q private/photo.webp
  printf 'changed bytes' >> mongodb.archive.gz
  if sha256sum --check --status SHA256SUMS; then exit 72; fi
done
echo NATIVE_BACKUP_CHECKSUM_FIXTURE_OK
`);
    const result = spawnSync(bash, [path.join(sandbox, 'fixture.sh').replaceAll('\\', '/'), sandbox.replaceAll('\\', '/')], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error?.message ?? ''}`);
    assert.match(result.stdout, /NATIVE_BACKUP_CHECKSUM_FIXTURE_OK/u);
  } finally {
    assert.equal(path.dirname(sandbox), temporaryRoot);
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('failed release cleanup and disk recovery preserve the active release', () => {
  const temporaryRoot = path.join(root, '.tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(temporaryRoot, 'deployment-shell-'));
  try {
    for (const file of ['deploy-release.sh', 'check-disk-space.sh', 'recover-disk-space.sh', 'deployment-lock.sh', 'prune-deployments.sh']) {
      const script = fs.readFileSync(path.join(root, 'deploy/native', file), 'utf8');
      // Exercise the actual scripts with only their fixed server root redirected.
      fs.writeFileSync(path.join(sandbox, file), script.replaceAll('/opt/elsadatrealestate', '${SANDBOX}'));
    }
    const fixture = `set -Eeuo pipefail
SANDBOX=$(mktemp -d)
export SANDBOX
trap '[[ "$SANDBOX" == /tmp/* ]] && rm -rf -- "$SANDBOX"' EXIT
FIXTURE=$1
mkdir -p "$SANDBOX/bin" "$SANDBOX/releases/20261001T000000Z" "$SANDBOX/source/deploy/native"
touch "$SANDBOX/releases/20261001T000000Z/runtime.txt" "$SANDBOX/source/package-lock.json"
cp "$FIXTURE/check-disk-space.sh" "$SANDBOX/source/deploy/native/"
ln -s "$SANDBOX/releases/20261001T000000Z" "$SANDBOX/current"
printf '#!/usr/bin/env bash\nif [[ $1 == -u ]]; then echo 0; else echo elsadat; fi\n' > "$SANDBOX/bin/id"
printf '#!/usr/bin/env bash\necho 20261004T152254Z\n' > "$SANDBOX/bin/date"
printf '#!/usr/bin/env bash\necho "Filesystem 1024-blocks Used Available Capacity Mounted"\necho "fixture 9000000 1000000 8000000 12%% /"\n' > "$SANDBOX/bin/df"
printf '#!/usr/bin/env bash\nexit 11\n' > "$SANDBOX/bin/rsync"
printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/chown"
# Git Bash has no util-linux flock. Linux CI exercises the real inherited lock.
if ! command -v flock >/dev/null; then printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/flock"; fi
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

test('retention is bounded, protects rollback and storage, and recovers space before build', () => {
  const temporaryRoot = path.join(root, '.tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(temporaryRoot, 'deployment-retention-'));
  try {
    for (const file of ['deployment-lock.sh', 'prune-deployments.sh', 'check-disk-space.sh', 'deploy-release.sh', 'manage-production.sh', 'healthcheck.sh', 'deploy-from-github.sh']) {
      fs.writeFileSync(path.join(sandbox, file), fs.readFileSync(path.join(root, 'deploy/native', file), 'utf8').replaceAll('/opt/elsadatrealestate', '${SANDBOX}'));
    }
    const fixture = `set -Eeuo pipefail
SANDBOX=$(mktemp -d)
export SANDBOX
trap '[[ "$SANDBOX" == /tmp/* ]] && rm -rf -- "$SANDBOX"' EXIT
FIXTURE=$1
REAL_FLOCK=false
if command -v flock >/dev/null; then REAL_FLOCK=true; fi
mkdir -p "$SANDBOX/bin" "$SANDBOX/releases" "$SANDBOX/staging" "$SANDBOX/private" "$SANDBOX/backups" "$SANDBOX/mongodb" "$SANDBOX/source/deploy/native"
touch "$SANDBOX/private/photo.jpg" "$SANDBOX/backups/database.archive" "$SANDBOX/mongodb/WiredTiger" "$SANDBOX/source/package-lock.json"
cp "$FIXTURE/check-disk-space.sh" "$SANDBOX/source/deploy/native/"
printf '#!/usr/bin/env bash\nif [[ $1 == -u ]]; then echo 1000; else echo elsadat; fi\n' > "$SANDBOX/bin/id"
if [[ $REAL_FLOCK == false ]]; then printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/flock"; fi
chmod +x "$SANDBOX/bin/"*
export PATH="$SANDBOX/bin:$PATH"
for NAME in 20260929T000000Z 20260930T000000Z 20261001T000000Z; do mkdir "$SANDBOX/releases/$NAME"; touch "$SANDBOX/releases/$NAME/runtime"; done
ln -s "$SANDBOX/releases/20261001T000000Z" "$SANDBOX/current"
ln -s "$SANDBOX/releases/20260930T000000Z" "$SANDBOX/previous"
mkdir "$SANDBOX/staging/github.AbCd01" "$SANDBOX/staging/github.AbCd02" "$SANDBOX/staging/github.unknown-name" "$SANDBOX/releases/manual-archive" "$SANDBOX/staging/reviewed-source" "$SANDBOX/staging/reviewed.AbCd01"
ln -s "$SANDBOX/private" "$SANDBOX/releases/20260928T000000Z"
ln -s "$SANDBOX/backups" "$SANDBOX/staging/github.AbCd03"
bash "$FIXTURE/prune-deployments.sh" "$SANDBOX/staging/github.AbCd02"
[[ ! -e "$SANDBOX/releases/20260929T000000Z" && ! -e "$SANDBOX/staging/github.AbCd01" ]]
[[ ! -e "$SANDBOX/staging/reviewed-source" && ! -e "$SANDBOX/staging/reviewed.AbCd01" ]]
[[ -d "$SANDBOX/staging/github.AbCd02" && -L "$SANDBOX/staging/github.AbCd03" && -L "$SANDBOX/releases/20260928T000000Z" ]]
[[ -d "$SANDBOX/staging/github.unknown-name" && -d "$SANDBOX/releases/manual-archive" ]]
[[ -f "$SANDBOX/current/runtime" && -f "$SANDBOX/previous/runtime" && -f "$SANDBOX/private/photo.jpg" && -f "$SANDBOX/backups/database.archive" && -f "$SANDBOX/mongodb/WiredTiger" ]]

# Invalid pointers fail before deleting any candidate, even an abandoned clone.
ln -sfn "$SANDBOX/releases/missing" "$SANDBOX/previous"
if bash "$FIXTURE/prune-deployments.sh"; then exit 70; fi
[[ -d "$SANDBOX/staging/github.AbCd02" ]]
ln -sfn "$SANDBOX/private" "$SANDBOX/previous"
if bash "$FIXTURE/prune-deployments.sh"; then exit 71; fi
[[ -f "$SANDBOX/private/photo.jpg" ]]
ln -sfn "$SANDBOX/releases/20260930T000000Z" "$SANDBOX/previous"

# A busy lock aborts before pruning. Use real OS locks on Ubuntu CI; Git Bash
# exercises the same refusal branch with a failing command adapter.
if [[ $REAL_FLOCK == true ]]; then
  (
    exec 9>>"$SANDBOX/.deployment.lock"
    flock --exclusive --nonblock 9
    bash "$FIXTURE/prune-deployments.sh" "$SANDBOX/staging/github.AbCd02"
    if (exec 9>&-; bash "$FIXTURE/prune-deployments.sh"); then exit 72; fi
  )
else
  printf '#!/usr/bin/env bash\nexit 1\n' > "$SANDBOX/bin/flock"
  if bash "$FIXTURE/prune-deployments.sh"; then exit 72; fi
  printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/flock"
fi
[[ -d "$SANDBOX/staging/github.AbCd02" ]]

# Full release ordering: reclaim an old node_modules tree before disk checks,
# keep current/previous until health succeeds, then rotate to exactly two.
mkdir "$SANDBOX/releases/20260929T000000Z"
printf '#!/usr/bin/env bash\necho "Filesystem 1024-blocks Used Available Capacity Mounted"\nif [[ -d "$SANDBOX/releases/20260929T000000Z" ]]; then echo "fixture 9000000 8999999 1 99%% /"; else echo "fixture 9000000 1000000 8000000 12%% /"; fi\n' > "$SANDBOX/bin/df"
printf '#!/usr/bin/env bash\necho "$FIXTURE_RELEASE_ID"\n' > "$SANDBOX/bin/date"
printf '#!/usr/bin/env bash\nfor ARG in "$@"; do DEST=$ARG; done\ncp -R "$SANDBOX/source/." "$DEST"\n' > "$SANDBOX/bin/rsync"
printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/npm"
printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/sudo"
printf '#!/usr/bin/env bash\nif [[ $FAIL_EXTERNAL == true && $* == *example.invalid* ]]; then exit 22; fi\n' > "$SANDBOX/bin/curl"
chmod +x "$SANDBOX/bin/"*
export FIXTURE_RELEASE_ID=20261015T000000Z
bash "$FIXTURE/deploy-release.sh" "$SANDBOX/source"
[[ $(readlink "$SANDBOX/current") == "$SANDBOX/releases/$FIXTURE_RELEASE_ID" ]]
[[ $(readlink "$SANDBOX/previous") == "$SANDBOX/releases/20261001T000000Z" ]]
[[ ! -d "$SANDBOX/releases/20260930T000000Z" ]]
[[ ! -d "$SANDBOX/staging/github.AbCd02" ]]

# A failed public smoke test must roll back and remove only the failed attempt.
export FIXTURE_RELEASE_ID=20261015T000001Z
if FAIL_EXTERNAL=true EXTERNAL_SMOKE_BASE_URL=https://example.invalid bash "$FIXTURE/deploy-release.sh" "$SANDBOX/source"; then exit 73; fi
[[ $(readlink "$SANDBOX/current") == "$SANDBOX/releases/20261015T000000Z" ]]
[[ -f "$SANDBOX/previous/runtime" && ! -d "$SANDBOX/releases/$FIXTURE_RELEASE_ID" ]]
[[ -f "$SANDBOX/private/photo.jpg" && -f "$SANDBOX/backups/database.archive" && -f "$SANDBOX/mongodb/WiredTiger" ]]

# Migration from an installation without a previous link preserves one fallback.
rm "$SANDBOX/previous"
mkdir "$SANDBOX/releases/20260930T000000Z"
mkdir "$SANDBOX/releases/20261016T000000Z"
bash "$FIXTURE/prune-deployments.sh"
[[ -d "$SANDBOX/releases/20261001T000000Z" && ! -d "$SANDBOX/releases/20260930T000000Z" && ! -d "$SANDBOX/releases/20261016T000000Z" ]]

# Execute the managed update as well: one Git pull, no clone or data mode,
# inherited release lock, and handoff removal on success and failed copy.
export OPERATOR_REPOSITORY="$SANDBOX/operator"
export PRODUCTION_ENV_FILE="$SANDBOX/production.env"
export PUBLIC_ORIGIN=https://example.invalid
mkdir -p "$OPERATOR_REPOSITORY/.git" "$OPERATOR_REPOSITORY/deploy/native"
cp "$FIXTURE/"*.sh "$OPERATOR_REPOSITORY/deploy/native/"
touch "$OPERATOR_REPOSITORY/package-lock.json" "$OPERATOR_REPOSITORY/deploy/native/release-source.exclude" "$OPERATOR_REPOSITORY/deploy/native/release-source.sparse-checkout" "$PRODUCTION_ENV_FILE"
printf '#!/usr/bin/env bash\nif [[ $1 == -u ]]; then echo 0; else echo elsadat; fi\n' > "$SANDBOX/bin/id"
printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/chown"
printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/node"
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> "$SANDBOX/systemctl.commands"\n' > "$SANDBOX/bin/systemctl"
printf '#!/usr/bin/env bash\nwhile [[ $1 == --* ]]; do shift; done\nexec "$@"\n' > "$SANDBOX/bin/setpriv"
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> "$SANDBOX/git.commands"\n' > "$SANDBOX/bin/git"
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> "$SANDBOX/npm.commands"\n' > "$SANDBOX/bin/npm"
printf '#!/usr/bin/env bash\nif [[ $FAIL_COPY == true ]]; then exit 11; fi\nfor ARG in "$@"; do SRC=$DEST; DEST=$ARG; done\ncp -R "$SRC/." "$DEST"\n' > "$SANDBOX/bin/rsync"
chmod +x "$SANDBOX/bin/"*
export FIXTURE_RELEASE_ID=20261015T000002Z
rm -f "$SANDBOX/systemctl.commands"
printf '#!/usr/bin/env bash\nexec "$@"\n' > "$SANDBOX/bin/sudo"
bash "$FIXTURE/manage-production.sh" update
[[ $(grep -c '^restart elsadat-api.service elsadat-web.service$' "$SANDBOX/systemctl.commands") == 1 ]]
[[ $(readlink "$SANDBOX/current") == "$SANDBOX/releases/$FIXTURE_RELEASE_ID" ]]
[[ -z $(find "$SANDBOX/staging" -maxdepth 1 -type d -name 'reviewed.*' -print) ]]
if grep -E 'clone' "$SANDBOX/git.commands"; then exit 74; fi
if grep -E 'production:(demo|launch)|db:seed' "$SANDBOX/npm.commands"; then exit 75; fi
[[ $(grep -c 'pull --ff-only' "$SANDBOX/git.commands") == 1 ]]
if FAIL_COPY=true bash "$FIXTURE/manage-production.sh" update; then exit 76; fi
[[ $(readlink "$SANDBOX/current") == "$SANDBOX/releases/$FIXTURE_RELEASE_ID" ]]
[[ -z $(find "$SANDBOX/staging" -maxdepth 1 -type d -name 'reviewed.*' -print) ]]
[[ -f "$SANDBOX/private/photo.jpg" && -f "$SANDBOX/backups/database.archive" && -f "$SANDBOX/mongodb/WiredTiger" ]]

# Backward-compatible direct entry from reviewed-source must not delete its
# launcher before cloning. The nested release may then reclaim that handoff.
mkdir -p "$SANDBOX/staging/reviewed-source"
cp -R "$OPERATOR_REPOSITORY/." "$SANDBOX/staging/reviewed-source"
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> "$SANDBOX/git.commands"\nif [[ $1 == clone ]]; then\n  [[ -f "$SANDBOX/staging/reviewed-source/package-lock.json" ]] || exit 77\n  for ARG in "$@"; do DEST=$ARG; done\n  cp -R "$SANDBOX/operator/." "$DEST"\nfi\n' > "$SANDBOX/bin/git"
export FIXTURE_RELEASE_ID=20261015T000003Z
bash "$SANDBOX/staging/reviewed-source/deploy/native/deploy-from-github.sh"
[[ $(readlink "$SANDBOX/current") == "$SANDBOX/releases/$FIXTURE_RELEASE_ID" ]]
[[ -z $(find "$SANDBOX/staging" -maxdepth 1 -type d -name 'github.??????' -print) ]]
[[ -f "$SANDBOX/private/photo.jpg" && -f "$SANDBOX/backups/database.archive" && -f "$SANDBOX/mongodb/WiredTiger" ]]
echo DEPLOYMENT_RETENTION_FIXTURE_OK
`;
    fs.writeFileSync(path.join(sandbox, 'fixture.sh'), fixture);
    const result = spawnSync(bash, [path.join(sandbox, 'fixture.sh').replaceAll('\\', '/'), sandbox.replaceAll('\\', '/')], { encoding: 'utf8', windowsHide: true, env: { ...process.env, MSYS: 'winsymlinks:nativestrict' } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error?.message ?? ''}`);
    assert.match(result.stdout, /DEPLOYMENT_RETENTION_FIXTURE_OK/u);
  } finally {
    assert.equal(path.dirname(sandbox), temporaryRoot);
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
