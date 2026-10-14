# Recover deployment disk space without deleting application data

`DEPLOYMENT_DISK_SPACE_REQUIRED` means the build was refused before switching
`current`. For example, `available_kb=2924036` is about 2.79 GiB, below the 3 GiB
build reserve. A successful earlier deployment remains live.

After this change is published, run in the existing root SSH session:

```bash
cd /root/sadat-release &&
git pull --ff-only origin main &&
bash deploy/native/recover-disk-space.sh &&
bash deploy/native/manage-production.sh update
```

Recovery and deployment remove only recognized deployment artifacts. They retain
`current` and `previous`, the explicit rollback release. On the first run of a
legacy installation without `previous`, the newest timestamp release older than
`current` is retained as the fallback. Other inactive timestamp releases are
removed. Unknown directory names and directory symlinks are left alone. Broken
or escaped release pointers abort cleanup before any release/source deletion.

Abandoned `staging/github.XXXXXX`, `staging/reviewed.XXXXXX` and the old
`staging/reviewed-source` handoff are removed under the same deployment lock.
The source of the running build is always protected. Recovery also removes
previously generated `docs/quality` artifacts from the existing release folders.
An optional exact failed-release timestamp argument is still supported; neither
the current nor explicit rollback release can be selected for removal.

The lock covers managed deployment, direct GitHub deployment, and recovery, so
cleanup cannot delete a different in-progress build. Managed deployment passes
its lock descriptor through `setpriv` when switching to the service user.
A competing operation exits with `DEPLOYMENT_ALREADY_RUNNING`.

## Avoid accumulating duplicate source and dependency trees

`manage-production.sh update` pulls the operator repository once. It copies only
tracked source files into a fresh, temporary service-readable handoff, retaining
checked-in environment examples and the required test evidence while excluding
secret environment files, `.git`, `node_modules`, generated builds and unused
screenshots. It deploys that reviewed source directly, without a second GitHub
clone. Tracked uncommitted changes are refused. The handoff is removed on both
success and normal failure; a handoff left by a killed process is reclaimed by
the next locked cleanup.

The build still runs typecheck, lint, tests, production build and configuration
checks. It never lowers the 3 GiB reserve to force a build. A failed inactive
release is removed automatically. Health-check failure restores the old current
link, including failure of the external smoke check. After success, `previous`
points to the old current release and cleanup retains exactly those two managed
runtime trees, including their dependencies for rollback.

Tracked filenames and exclusion rules both use NUL separators during the
handoff: [`--from0` affects both inputs](https://download.samba.org/pub/rsync/rsync.1#opt--from0).

`update` does not seed, copy, deduplicate or purge database records. It leaves
MongoDB files, private uploaded images/documents and backup archives untouched.
`demo`, `empty` and `launch` remain separate explicitly selected data operations;
do not use them to free deployment disk space.

If cleanup still leaves less than 3 GiB free, inspect usage and increase disk
capacity or review the unrelated large files. Do not remove live storage to
force deployment:

```bash
df -h /opt
df -i /opt
du -sh /opt/elsadatrealestate/releases/* /opt/elsadatrealestate/staging/* /var/backups/elsadatrealestate /root/.npm /var/lib/elsadat/.npm 2>/dev/null
```

## Verification

`packages/config/tests/native-deployment-shell.test.mjs` executes the real Bash
cleanup and release scripts in redirected temporary roots. Scenarios cover
bounded retention, legacy fallback, abandoned handoffs/clones, symlink escapes,
broken pointers, busy-lock refusal, disk reclamation before the space check,
failed-copy cleanup, successful rotation and external-smoke rollback. Sentinel
MongoDB, upload and backup files survive every scenario. Linux uses real
`flock`; Git Bash lacks util-linux and uses a command adapter for lock branches.
The sparse-checkout/packaging tests retain required parity evidence and ensure
managed deployment uses tracked source directly with environment examples.
The managed-update shell fixture also verifies no second clone, no seed/data
commands, and handoff removal after success or a failed copy. The workspace
suite passes 34 tests. Actual production cleanup must be run on the server;
these checks use temporary local fixtures, never the production filesystem.
