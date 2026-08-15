import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

test('checked-in container artifacts describe a multi-stage non-root runtime and safe health checks', async () => {
  const dockerfile = await fs.readFile(path.join(repositoryRoot, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /FROM node:24-bookworm-slim AS dependencies/);
  assert.match(dockerfile, /FROM dependencies AS build/);
  assert.match(dockerfile, /FROM node:24-bookworm-slim AS runtime/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /CMD \["node", "apps\/api\/dist\/server\.js"\]/);
  assert.doesNotMatch(dockerfile, /AUTH_ACCESS_TOKEN_SECRET\s*=/);
});

test('development Compose provisions an isolated Mongo replica set without checked-in secrets', async () => {
  const compose = await fs.readFile(path.join(repositoryRoot, 'docker-compose.yml'), 'utf8');
  assert.match(compose, /services:/);
  assert.match(compose, /\n\s{2}api:/);
  assert.match(compose, /\n\s{2}mongo:/);
  assert.match(compose, /\n\s{2}mongo-init:/);
  assert.match(compose, /replicaSet=rs0/);
  assert.match(compose, /service_completed_successfully/);
  assert.match(compose, /\$\{AUTH_ACCESS_TOKEN_SECRET:\?/);
  assert.doesNotMatch(compose, /AUTH_ACCESS_TOKEN_SECRET:\s*['"]?[A-Za-z0-9_-]{43,}['"]?/);
});
