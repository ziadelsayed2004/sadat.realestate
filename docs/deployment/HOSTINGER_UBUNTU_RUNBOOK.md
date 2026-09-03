# Hostinger Ubuntu VPS native runbook

> This is a single-VPS deployment candidate. Private files are stored outside the public web root and scanned by ClamAV. Project Owner and Security approval of this boundary, plus an encrypted off-server restore drill, is still required before a Production-ready claim.

## 1. DNS and Hostinger email

Create `info@elsadatrealestate.com` in hPanel. Copy current SPF, DKIM, and DMARC values from Hostinger; do not invent DNS records. Point the apex and `www` records to the VPS public IP.

SMTP profile:

- Host: `smtp.hostinger.com`
- Port 465 with implicit TLS
- Fallback: port 587 with STARTTLS
- Username: `info@elsadatrealestate.com`
- Password: stored only in `/etc/elsadatrealestate/production.env`

## 2. Host security

Use a non-root sudo operator and SSH keys. Apply Ubuntu security updates, configure time synchronization and Hostinger snapshots, then allow only SSH, HTTP, and HTTPS through provider firewall and UFW. Never expose ports 27017, 3310, 3000, or 4173.

## 3. Install native services

Upload a reviewed source release to a staging directory, then run:

```bash
sudo bash deploy/native/install-ubuntu.sh
```

This installs Node.js when required, Nginx, Certbot, MongoDB Community, database tools, ClamAV, rsync, timers, and restricted service definitions. It creates the `elsadat` application account and application directories.

Generate the protected environment:

```bash
npm run production:prepare
sudo install -o root -g elsadat -m 0640 .env.production /etc/elsadatrealestate/production.env
sudoedit /etc/elsadatrealestate/production.env
sudo -u elsadat env PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env \
  node scripts/production-preflight.mjs
```

Replace `SMTP_PASSWORD` with the actual mailbox password. Keep it quoted if it contains shell-sensitive characters. Do not print or paste it into source, tickets, Agent Pack, or chat.

## 4. MongoDB and ClamAV

Initialize the loopback authenticated replica set once:

```bash
sudo PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env bash deploy/native/configure-mongodb.sh
sudo systemctl status mongod clamav-daemon clamav-freshclam --no-pager
sudo ufw --force enable
```

Confirm MongoDB reports PRIMARY state and ClamAV is listening only on `127.0.0.1:3310`. Run an isolated EICAR test and confirm the application fails closed on infected uploads before accepting the scanner boundary.

## 5. Deploy the application

Run releases as the application account:

```bash
sudo -u elsadat bash deploy/native/deploy-release.sh /absolute/path/to/reviewed-source
sudo systemctl enable --now elsadat-api.service elsadat-web.service
sudo systemctl enable --now elsadat-backup.timer elsadat-healthcheck.timer
```

For subsequent deployments directly from the reviewed GitHub branch:

```bash
sudo -u elsadat env RELEASE_REF=main \
  EXTERNAL_SMOKE_BASE_URL=https://elsadatrealestate.com \
  bash /opt/elsadatrealestate/current/deploy/native/deploy-from-github.sh
```

For the first GitHub deployment, clone the repository into a temporary operator
directory, run `install-ubuntu.sh`, then invoke `deploy-from-github.sh` from that
clone. Private repositories require a read-only deploy key; never place a GitHub
token in the repository URL or shell history.

The deploy script installs locked dependencies, runs typecheck/lint/tests/build/native configuration checks, switches an atomic release symlink, restarts API/Web, waits for loopback readiness, and restores the previous release if readiness fails. Public HTTPS smoke is intentionally deferred until the certificate exists. On later releases, pass `EXTERNAL_SMOKE_BASE_URL=https://elsadatrealestate.com` to include it in the deploy gate.

Inspect:

```bash
sudo systemctl status elsadat-api elsadat-web --no-pager
sudo journalctl -u elsadat-api -u elsadat-web -n 200 --no-pager
curl -fsS http://127.0.0.1:3000/ready
curl -fsS http://127.0.0.1:4173/health
sudo systemctl start elsadat-healthcheck.service
```

## 6. HTTPS and Nginx

Before certificate creation, confirm port 80 and DNS reach the VPS. Then:

```bash
sudo bash deploy/native/enable-https.sh
sudo nginx -t
curl -fsSIL https://elsadatrealestate.com/
SMOKE_BASE_URL=https://elsadatrealestate.com npm run production:smoke
```

The final Nginx configuration redirects `www`, keeps `/api/v1` unchanged, and proxies only to loopback API/Web processes.

## 7. SMTP and real OTP

Load the environment without echoing it:

```bash
set -a
source /etc/elsadatrealestate/production.env
set +a
npm run smtp:check
SMTP_SMOKE_RECIPIENT=info@elsadatrealestate.com SMTP_SMOKE_CONFIRM=SEND_TEST_EMAIL npm run smtp:smoke
unset SMTP_PASSWORD SMTP_SMOKE_RECIPIENT SMTP_SMOKE_CONFIRM
```

Perform an isolated Seeker registration, retrieve the delivered OTP, verify it once, prove replay and wrong-code failure, then restrict/delete the test account through the approved Admin flow.

## 8. First Super Admin

After readiness, read credentials silently and run the compiled bootstrap once:

```bash
read -r ADMIN_BOOTSTRAP_EMAIL
read -rs ADMIN_BOOTSTRAP_PASSWORD
export ADMIN_BOOTSTRAP_EMAIL ADMIN_BOOTSTRAP_PASSWORD
export ADMIN_BOOTSTRAP_CONFIRMATION=CREATE_FIRST_SUPER_ADMIN
export ADMIN_BOOTSTRAP_LOCALE=ar
sudo --preserve-env=ADMIN_BOOTSTRAP_EMAIL,ADMIN_BOOTSTRAP_PASSWORD,ADMIN_BOOTSTRAP_CONFIRMATION,ADMIN_BOOTSTRAP_LOCALE \
  bash -c 'set -a; source /etc/elsadatrealestate/production.env; set +a; \
  exec runuser -u elsadat --preserve-environment -- \
  /usr/bin/node /opt/elsadatrealestate/current/apps/api/dist/modules/admin/run-bootstrap.js'
unset ADMIN_BOOTSTRAP_EMAIL ADMIN_BOOTSTRAP_PASSWORD ADMIN_BOOTSTRAP_CONFIRMATION ADMIN_BOOTSTRAP_LOCALE
```

## 9. Backup, restore, and monitoring

The daily timer writes checksummed MongoDB and private-file archives under `/var/backups/elsadatrealestate`. Configure an encrypted off-server copy; a VPS-local archive or provider snapshot is not enough.

```bash
sudo systemctl start elsadat-backup.service
sudo -i
set -a
source /etc/elsadatrealestate/production.env
set +a
RESTORE_TARGET_DATABASE=sadat_restore_verify \
  /opt/elsadatrealestate/current/deploy/native/restore.sh \
  /var/backups/elsadatrealestate/20260825T120000Z
exit
```

Replace the example timestamp with an existing backup directory. Always restore to an isolated verification database first; replacing `sadat` additionally requires `RESTORE_CONFIRM=REPLACE_PRODUCTION`.

Monitor uptime, `/ready`, certificate renewal, disk/RAM/CPU, MongoDB state, ClamAV signatures, backup age, and off-server copy success. Record a successful isolated restore before DNS cutover.
