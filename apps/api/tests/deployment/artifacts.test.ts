import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

test('checked-in system services run API and Web as a restricted non-root account', async () => {
  const api = await fs.readFile(path.join(repositoryRoot, 'deploy/systemd/elsadat-api.service'), 'utf8');
  const web = await fs.readFile(path.join(repositoryRoot, 'deploy/systemd/elsadat-web.service'), 'utf8');
  for (const unit of [api, web]) {
    assert.match(unit, /User=elsadat/);
    assert.match(unit, /EnvironmentFile=\/etc\/elsadatrealestate\/production\.env/);
    assert.match(unit, /NoNewPrivileges=true/);
    assert.match(unit, /ProtectSystem=strict/);
    assert.doesNotMatch(unit, /AUTH_ACCESS_TOKEN_SECRET\s*=/);
  }
  assert.match(api, /ExecStart=\/usr\/bin\/node apps\/api\/dist\/server\.js/);
  assert.match(web, /ExecStart=\/usr\/bin\/node apps\/web\/server\.mjs --mode production/);
});

test('native MongoDB and Nginx artifacts use loopback boundaries and an authenticated replica set', async () => {
  const mongo = await fs.readFile(path.join(repositoryRoot, 'deploy/mongodb/mongod-production.conf'), 'utf8');
  const nginx = await fs.readFile(path.join(repositoryRoot, 'deploy/nginx/elsadatrealestate.conf'), 'utf8');
  assert.match(mongo, /bindIp: 127\.0\.0\.1/);
  assert.match(mongo, /replSetName: rs0/);
  assert.match(mongo, /authorization: enabled/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3000;/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:4173;/);
  assert.doesNotMatch(nginx, /PRIVATE_DOWNLOAD_SIGNING_SECRET|SMTP_PASSWORD/);
});

test('real launch is backup-gated and no production deployment path installs demo data', async () => {
  const manage = await fs.readFile(path.join(repositoryRoot, 'deploy/native/manage-production.sh'), 'utf8');
  const legacyDemo = await fs.readFile(path.join(repositoryRoot, 'deploy/native/update-and-install-demo.sh'), 'utf8');
  const privatePurge = await fs.readFile(path.join(repositoryRoot, 'deploy/native/purge-private-files.sh'), 'utf8');
  assert.match(manage, /<update\|empty\|launch>/);
  assert.match(manage, /production:launch:plan/);
  assert.match(manage, /production:launch:purge/);
  assert.match(manage, /NATIVE_BACKUP_OK path=/);
  assert.doesNotMatch(manage, /production:demo:seed/);
  const packageFile = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  assert.equal(packageFile.scripts['production:demo:seed'], undefined);
  assert.match(legacyDemo, /PRODUCTION_DEMO_DISABLED/);
  assert.match(privatePurge, /sha256sum --check --status SHA256SUMS/);
  assert.match(privatePurge, /resolved_private.*\/var\/lib\/elsadatrealestate\/private/);
});
