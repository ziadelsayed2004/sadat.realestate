#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this database provisioning script as root.' >&2
  exit 1
fi

REPOSITORY_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
ENV_FILE=${PRODUCTION_ENV_FILE:-/etc/elsadatrealestate/production.env}
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
: "${MONGO_ROOT_USERNAME:?missing MONGO_ROOT_USERNAME}"
: "${MONGO_ROOT_PASSWORD:?missing MONGO_ROOT_PASSWORD}"
: "${MONGO_APP_USERNAME:?missing MONGO_APP_USERNAME}"
: "${MONGO_APP_PASSWORD:?missing MONGO_APP_PASSWORD}"
: "${MONGO_REPLICA_KEY:?missing MONGO_REPLICA_KEY}"

install -o root -g root -m 0644 "$REPOSITORY_ROOT/deploy/mongodb/mongod-bootstrap.conf" /etc/mongod.conf
systemctl restart mongod

MONGO_BOOTSTRAP_READY=false
for _ in {1..60}; do
  if mongosh --quiet --host 127.0.0.1 --port 27017 --eval 'db.adminCommand({ping:1}).ok' >/dev/null 2>&1; then
    MONGO_BOOTSTRAP_READY=true
    break
  fi
  sleep 1
done
if [[ $MONGO_BOOTSTRAP_READY != true ]]; then
  echo 'MongoDB bootstrap did not become reachable. Inspect: systemctl status mongod and journalctl -u mongod.' >&2
  exit 1
fi

mongosh --quiet --host 127.0.0.1 --port 27017 <<'MONGO'
try { rs.status() } catch (_) { rs.initiate({_id:'rs0', members:[{_id:0, host:'127.0.0.1:27017'}]}) }
MONGO

for _ in {1..60}; do
  if mongosh --quiet --host 127.0.0.1 --port 27017 --eval 'quit(rs.isMaster().ismaster ? 0 : 1)' >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! mongosh --quiet --host 127.0.0.1 --port 27017 --eval 'quit(rs.isMaster().ismaster ? 0 : 1)' >/dev/null 2>&1; then
  echo 'MongoDB replica set did not elect a PRIMARY during bootstrap.' >&2
  exit 1
fi

mongosh --quiet --host 127.0.0.1 --port 27017 <<'MONGO'
const admin = db.getSiblingDB('admin');
if (!admin.getUser(process.env.MONGO_ROOT_USERNAME)) {
  admin.createUser({user:process.env.MONGO_ROOT_USERNAME,pwd:process.env.MONGO_ROOT_PASSWORD,roles:[{role:'root',db:'admin'}]});
}
const app = db.getSiblingDB('sadat');
if (!app.getUser(process.env.MONGO_APP_USERNAME)) {
  app.createUser({user:process.env.MONGO_APP_USERNAME,pwd:process.env.MONGO_APP_PASSWORD,roles:[{role:'readWrite',db:'sadat'}]});
}
MONGO

printf '%s' "$MONGO_REPLICA_KEY" > /etc/mongodb-keyfile
chown mongodb:mongodb /etc/mongodb-keyfile
chmod 0400 /etc/mongodb-keyfile
install -o root -g root -m 0644 "$REPOSITORY_ROOT/deploy/mongodb/mongod-production.conf" /etc/mongod.conf
systemctl restart mongod

for _ in {1..60}; do
  if mongosh --quiet --host 127.0.0.1 --port 27017 --eval '
    const admin=db.getSiblingDB("admin");
    if(!admin.auth(process.env.MONGO_ROOT_USERNAME,process.env.MONGO_ROOT_PASSWORD)) quit(2);
    quit(rs.status().myState===1 ? 0 : 3);' >/dev/null 2>&1; then
    echo 'MONGODB_NATIVE_RS0_READY auth=enabled bind=loopback'
    exit 0
  fi
  sleep 1
done

echo 'MongoDB did not become an authenticated PRIMARY.' >&2
exit 1
