#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this provisioning script as root.' >&2
  exit 1
fi

REPOSITORY_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx \
  clamav clamav-daemon clamav-freshclam rsync jq ufw logrotate sudo

install -d -m 0755 /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/mongodb-server-8.0.gpg ]]; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | gpg --dearmor -o /etc/apt/keyrings/mongodb-server-8.0.gpg
fi
echo "deb [arch=amd64,arm64 signed-by=/etc/apt/keyrings/mongodb-server-8.0.gpg] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
  > /etc/apt/sources.list.d/mongodb-org-8.0.list

if ! command -v node >/dev/null 2>&1 \
  || [[ $(node -p 'Number(process.versions.node.split(".")[0])') -lt 22 ]] \
  || [[ $(node -p 'Number(process.versions.node.split(".")[0])') -gt 24 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/elsadat-nodesource.sh
  bash /tmp/elsadat-nodesource.sh
  rm -f /tmp/elsadat-nodesource.sh
  apt-get install -y nodejs
fi

apt-get update
apt-get install -y mongodb-org mongodb-database-tools

if ! id -u elsadat >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/elsadat --shell /bin/bash elsadat
fi
usermod --shell /bin/bash elsadat

install -d -o elsadat -g elsadat -m 0750 \
  /opt/elsadatrealestate \
  /opt/elsadatrealestate/releases \
  /var/lib/elsadatrealestate/private \
  /var/backups/elsadatrealestate \
  /var/log/elsadatrealestate
install -d -o root -g elsadat -m 0750 /etc/elsadatrealestate
install -d -o www-data -g www-data -m 0755 /var/www/letsencrypt
printf '%s\n' \
  'elsadat ALL=(root) NOPASSWD: /usr/bin/systemctl restart elsadat-api.service elsadat-web.service' \
  > /etc/sudoers.d/elsadat-deploy
chmod 0440 /etc/sudoers.d/elsadat-deploy
visudo -cf /etc/sudoers.d/elsadat-deploy

install -m 0644 "$REPOSITORY_ROOT/deploy/systemd/"*.service /etc/systemd/system/
install -m 0644 "$REPOSITORY_ROOT/deploy/systemd/"*.timer /etc/systemd/system/
install -m 0644 "$REPOSITORY_ROOT/deploy/nginx/elsadatrealestate-http.conf" /etc/nginx/sites-available/elsadatrealestate.conf
ln -sfn /etc/nginx/sites-available/elsadatrealestate.conf /etc/nginx/sites-enabled/elsadatrealestate.conf
rm -f /etc/nginx/sites-enabled/default

sed -i -E 's/^(TCPSocket|TCPAddr|StreamMaxLength|MaxFileSize|MaxScanSize|ReadTimeout)[[:space:]]/# Native runtime replaced: /' /etc/clamav/clamd.conf
grep -Ev '^[[:space:]]*(#|$)' "$REPOSITORY_ROOT/deploy/clamav/elsadat-clamd.conf" >> /etc/clamav/clamd.conf

systemctl daemon-reload
systemctl enable mongod clamav-daemon clamav-freshclam nginx
systemctl restart clamav-daemon clamav-freshclam
nginx -t
systemctl restart nginx

ufw allow OpenSSH
ufw allow 'Nginx Full'

echo 'NATIVE_UBUNTU_PACKAGES_READY'
echo 'Next: install .env.production as root:elsadat mode 0640 at /etc/elsadatrealestate/production.env, then run configure-mongodb.sh.'
