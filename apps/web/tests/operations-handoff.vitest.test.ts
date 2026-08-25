import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const guidePath = path.join(repositoryRoot, 'agent_pack', '08_reality_sync', 'OPERATIONS_HANDOFF_GUIDE.md');

describe('operations handoff guide', () => {
  it('documents the current executable setup, route, role, readiness, and rollback boundaries', () => {
    expect(existsSync(guidePath)).toBe(true);
    const guide = readFileSync(guidePath, 'utf8');
    for (const heading of [
      '## Prerequisites',
      '## Local setup',
      '## Environments and fail-closed boundaries',
      '## Processes and route boundaries',
      '## Roles and permission operations',
      '## Health, readiness, and smoke checks',
      '## Troubleshooting',
      '## Release and rollback',
      '## Verification handoff'
    ]) expect(guide).toContain(heading);
    for (const source of [
      'apps/web/src/routes/route-table.ts',
      'apps/api/src/modules/database/api-inventory.ts',
      'packages/contracts/src/',
      'agent_pack/01_product/ROLES_PERMISSIONS_MATRIX.md',
      'docs/api/environment.md',
      'deploy/nginx/elsadatrealestate.conf',
      'deploy/systemd/elsadat-api.service',
      'deploy/native/deploy-release.sh',
      'apps/web/tests/preview-deployment.vitest.test.ts'
    ]) expect(guide).toContain(source);
    for (const command of [
      'npm.cmd run typecheck',
      'npm.cmd run lint',
      'npm.cmd test',
      'npm.cmd run build',
      'npm.cmd run api:inventory',
      'npm.cmd run openapi:validate',
      'npm.cmd run postman:validate',
      'node agent_pack/scripts/audit_pack.mjs'
    ]) expect(guide).toContain(command);
    expect(guide).toContain('Arabic is RTL');
    expect(guide).toContain('View Only users');
    expect(guide).toContain('DESIGN-EXCEPTION-ADM-54');
    expect(guide).not.toMatch(/AUTH_ACCESS_TOKEN_SECRET\s*[:=]\s*['"]?[A-Za-z0-9_-]{32,}/u);
    expect(guide).not.toMatch(/(?:password|token|secret|credential)\s*[:=]\s*['"][^<\n]{8,}/iu);
  });
});
