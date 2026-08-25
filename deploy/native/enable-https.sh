#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this TLS activation script as root.' >&2
  exit 1
fi

REPOSITORY_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
certbot certonly --webroot --webroot-path /var/www/letsencrypt \
  --domain elsadatrealestate.com --domain www.elsadatrealestate.com \
  --email info@elsadatrealestate.com --agree-tos --no-eff-email
install -m 0644 "$REPOSITORY_ROOT/deploy/nginx/elsadatrealestate.conf" /etc/nginx/sites-available/elsadatrealestate.conf
nginx -t
systemctl reload nginx
systemctl enable --now certbot.timer
certbot renew --dry-run
echo 'NGINX_HTTPS_READY domain=elsadatrealestate.com'

