# Live Preview Handoff — 2026-08-31

## Coordinator observation

The coordinator ran only the safe diagnostic commands below. The local supervisor is stopped; no application process, MongoDB target, seed, email catcher, or generated environment file was started or changed by this reconciliation.

| Command | Exit code | Observed result |
| --- | ---: | --- |
| `node --version` | 0 | `v24.19.0` |
| `npm.cmd --version` | 0 | `11.6.4` |
| `npm.cmd run local:check` | 0 | `LOCAL_DOCTOR_OK`; Node 24, npm, external Mongo target 127.0.0.1:27018, ports and dependencies ready |
| `npm.cmd run local:status` | 1 | `LOCAL_STATUS stopped ready=false` |

## Owner startup sequence

Run this exact sequence only when the owner authorizes a local preview start:

```powershell
npm.cmd ci
npm.cmd run local:prepare
npm.cmd run local:check
npm.cmd run local:up
npm.cmd run local:smoke
```

The owner must record the visible state after each command. The coordinator did not run this sequence because the current goal forbids starting/seed operations.

## Preview URLs

- Platform: http://localhost:8080
- Captured OTP inbox: http://localhost:8025

## Safe data and login references

- Local-only seed and login behavior: [docs/deployment/LOCAL_PREVIEW.md](../../docs/deployment/LOCAL_PREVIEW.md)
- Synthetic fixture boundary: [docs/api/uat-fixtures.md](../../docs/api/uat-fixtures.md)
- Auth boundary: [docs/api/authentication.md](../../docs/api/authentication.md)
- Never copy local credentials, OTPs, Mongo URIs, or generated environment values into Git, Agent Pack, logs, screenshots, or this handoff.

## Topology and recovery prerequisites

- Supply a non-production external `MONGODB_URI`; the repository does not download or start MongoDB.
- Transactions and request workflows require a replica-set-capable isolated target.
- Production readiness additionally requires the approved Mongo replica-set, encrypted Mongo backups, separate Vault snapshot/key custody, external visual bundle backup, suppression/deletion ledger replay, malware scanning, private storage, observability, and Hostinger SMTP/DNS validation.

## Logs and stop

- Inspect repository-owned startup output with `npm.cmd run local:logs`.
- Stop only repository-owned child processes with `npm.cmd run local:down`.
- Re-run `npm.cmd run local:status` after stopping.
- Do not delete `.local`, reset Git, or remove external Mongo data as part of routine stop.

## Current handoff state

`LIVE_PREVIEW_STOPPED_OWNER_START_REQUIRED`
