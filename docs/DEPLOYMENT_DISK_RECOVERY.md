# Recover a deployment that ran out of disk space

The failed `20261004T152254Z` release stopped during rsync, before changing the
`current` link. The previously active release remains selected. Do not remove
MongoDB files, private uploads, backup archives, or the active release.

After publishing the deployment-script fix to `main`, run these commands in the
existing root SSH session. Run only one deployment/recovery at a time.

```bash
cd /root/sadat-release

# Free the incomplete attempt first so git pull can write its small update.
FAILED=/opt/elsadatrealestate/releases/20261004T152254Z
if [ "$(realpath -m "$FAILED")" != "$FAILED" ] || [ -L "$FAILED" ] || [ "$(readlink -e /opt/elsadatrealestate/current)" = "$FAILED" ]; then
  echo 'Unsafe or active release; stop and inspect.'
else
  rm -rf -- "$FAILED"
fi

git pull --ff-only origin main &&
bash deploy/native/recover-disk-space.sh &&
bash deploy/native/manage-production.sh update
```

`recover-disk-space.sh` removes only generated `docs/quality` material from
release folders and the reviewed-source staging folder. Its optional first
argument is the exact timestamp ID of a known failed release; it refuses the
active release or a symlink target. Old working releases remain available for
rollback.

`update` deploys code without adding demo records. `demo` also adds missing
synthetic data; use it only when that is intended.

Deployment now excludes generated quality reports and captures during staging
and release copying. Git's sparse checkout also excludes them before checkout,
so the blob-filtered clone does not fetch unused images. The single SEK-04
runtime capture referenced by the parity ledger is explicitly retained in both
filters until tests finish; it is pruned with `docs/quality` after the gates.
The deployment regression test reads the actual ledgers to check these dependencies.
Design reference files,
browser specs, manifests and public runtime assets are retained for the existing
typecheck/lint/test/build gates. Design reference images are pruned after the
gates, as before. Unsuccessful, inactive release attempts are removed on exit.

If disk recovery has already succeeded but deployment stops with `SEK-04 runtime
evidence is missing`, publish/pull the evidence-filter fix and rerun
`bash deploy/native/manage-production.sh update`. No additional recovery or
test skipping is needed. The inactive failed attempt is cleaned up automatically.

At least 3 GiB must be free before cloning and before creating a release. If the
preflight still fails, inspect usage instead of deleting application data:

```bash
df -h /opt
df -i /opt
du -sh /opt/elsadatrealestate/releases/* /opt/elsadatrealestate/staging/* /var/backups/elsadatrealestate /root/.npm 2>/dev/null
```
