# Production release checklist

- [ ] Agent Pack audit is clean and no unrelated task is `in_progress`.
- [ ] ADM-54 and all design-source integrity gaps are explicitly resolved or release remains blocked.
- [ ] Typecheck, lint, unit, integration, API, build, dependency audit, OpenAPI, Postman, browser, visual, accessibility, locale, performance, security, and UAT gates pass on the release source.
- [ ] `npm run local:up` auto-seeds and `npm run local:smoke` passes on Windows and one Unix host.
- [ ] `/etc/elsadatrealestate/production.env` has no placeholders, is owned by `root:elsadat` with mode 0640, and passes Production preflight.
- [ ] Nginx configuration passes `nginx -t`; API/Web bind only to loopback.
- [ ] systemd units pass verification, start after reboot, restart after failure, and stop gracefully.
- [ ] DNS apex/www, SPF, DKIM, and DMARC are verified from authoritative DNS.
- [ ] Certbot issue/renewal and HTTPS redirect behavior pass externally.
- [ ] Hostinger SMTP verify, one confirmed delivery, OTP registration, wrong-code, expiry, cooldown, replay, refresh, and logout pass with isolated data.
- [ ] MongoDB reports authenticated PRIMARY `rs0` topology and transaction journeys pass.
- [ ] ClamAV readiness, signature freshness, clean upload, and EICAR rejection pass without exposing port 3310.
- [ ] Q-003 is closed by an approved storage adapter or recorded Owner + Security acceptance of the native single-VPS private-storage and off-server-backup boundary.
- [ ] Private documents/payment proofs cannot be fetched through permanent public URLs or another owner's authorization.
- [ ] First Admin is bootstrapped once; RBAC, view-only, IDOR, self-lockout, and last-Super-Admin protections pass.
- [ ] MongoDB and private-file backups are checksummed, copied encrypted off-server, and restored into isolation successfully.
- [ ] Monitoring, disk alerts, log retention, certificate alerts, incident contacts, and rollback owner are assigned.
- [ ] No synthetic seed, real environment file, mailbox password, private key, token, test upload, or test identity exists in the release directory.
