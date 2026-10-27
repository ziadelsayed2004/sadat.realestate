import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createCommissionPolicyService } from '../../src/modules/commissions/policy-service.js';
import { setupAgreedCommissionDefaults } from '../../src/modules/commissions/setup-defaults.js';

const admin = { sub: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'admin', status: 'verified' } as AccessTokenClaims;
test('agreed owner/office sale and rental defaults are previewable, editable, and never overwrite admin changes', async () => {
  const service = createCommissionPolicyService();
  const preview = await setupAgreedCommissionDefaults(service, admin);
  assert.deepEqual(preview.map(item => [item.salePercent, item.rentMonths]), [[2, 0.5], [1.5, 0.5]]);
  assert.equal((await service.listPolicies(admin, {})).total, 0);
  assert.equal((await setupAgreedCommissionDefaults(service, admin, true)).filter(item => item.status === 'activated').length, 2);
  const policies = (await service.listPolicies(admin, {})).items;
  assert.equal(policies.every(item => item.status === 'active'), true);
  assert.equal(policies.some(item => item.scope.key === 'developer_company'), false);
  const owner = policies.find(item => item.scope.key === 'individual_broker')!;
  await service.updatePolicy(admin, owner.id, { expectedVersion: owner.version, reason: 'Owner updates the agreement', percentageBps: 175, rentMonths: 1 });
  assert.equal((await setupAgreedCommissionDefaults(service, admin, true)).every(item => item.status === 'existing-preserved'), true);
  assert.equal((await service.getPolicy(admin, owner.id)).percentageBps, 175);
  assert.equal((await service.getPolicy(admin, owner.id)).rentMonths, 1);
});
