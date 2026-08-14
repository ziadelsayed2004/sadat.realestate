import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminRoleAssignmentRequestSchema,
  RBAC_OBJECT_SCOPE_RELATIONS,
  RBAC_PERMISSIONS,
  rbacAvailableActionKeySchema,
  rbacObjectScopeRelationSchema,
  rbacResourceStateKeySchema,
  rbacRoleCreateRequestSchema,
  rbacRolePatchRequestSchema
} from '@sadat-real-estate/contracts';

test('publishes a closed stable permission catalog without persisted wildcards', () => {
  assert.ok(RBAC_PERMISSIONS.includes('admin:roles.view'));
  assert.ok(RBAC_PERMISSIONS.includes('admin:roles.manage'));
  assert.equal(RBAC_PERMISSIONS.some((permission) => permission.includes('*')), false);
  assert.equal(new Set(RBAC_PERMISSIONS).size, RBAC_PERMISSIONS.length);
});

test('publishes stable object-scope, state, and available-action keys', () => {
  assert.deepEqual(RBAC_OBJECT_SCOPE_RELATIONS, [
    'owner', 'assigned', 'review_scope', 'global'
  ]);
  assert.equal(rbacObjectScopeRelationSchema.safeParse('client_claimed_owner').success, false);
  assert.equal(rbacAvailableActionKeySchema.safeParse('needs_replacement').success, true);
  assert.equal(rbacAvailableActionKeySchema.safeParse('../update').success, false);
  assert.equal(rbacResourceStateKeySchema.safeParse('pending_review').success, true);
  assert.equal(rbacResourceStateKeySchema.safeParse('Pending Review').success, false);
});

test('accepts strict custom and View Only role inputs', () => {
  const custom = rbacRoleCreateRequestSchema.parse({
    name: 'Account Reviewers',
    description: 'Reviews provider accounts',
    accessMode: 'custom',
    permissions: ['admin:providers.view', 'admin:providers.review'],
    reason: 'Create the provider review role'
  });
  assert.equal(custom.name, 'Account Reviewers');
  assert.deepEqual(rbacRoleCreateRequestSchema.parse({
    name: 'View Only',
    accessMode: 'view_only',
    permissions: ['admin:providers.view', 'admin:roles.view'],
    reason: 'Create a read-only review role'
  }).permissions, ['admin:providers.view', 'admin:roles.view']);
});

test('rejects unknown, duplicate, mutating View Only, and mass-assigned permissions', () => {
  for (const value of [
    {
      name: 'Wildcard', accessMode: 'custom', permissions: ['admin:*']
    },
    {
      name: 'Duplicate', accessMode: 'custom',
      permissions: ['admin:roles.view', 'admin:roles.view'], reason: 'Duplicate permissions'
    },
    {
      name: 'Unsafe View Only', accessMode: 'view_only', permissions: ['admin:roles.manage'],
      reason: 'Unsafe mutation'
    },
    {
      name: 'Loose', accessMode: 'custom', permissions: ['admin:roles.view'],
      reason: 'Mass assignment attempt', superAdmin: true
    }
  ]) {
    assert.equal(rbacRoleCreateRequestSchema.safeParse(value).success, false);
  }
});

test('requires optimistic versioning and an actual patch change', () => {
  assert.equal(rbacRolePatchRequestSchema.safeParse({ version: 0 }).success, false);
  assert.equal(rbacRolePatchRequestSchema.safeParse({ active: false }).success, false);
  assert.equal(rbacRolePatchRequestSchema.safeParse({
    version: 0, active: false, reason: 'Deactivate obsolete role'
  }).success, true);
});

test('validates bounded unique administrator role assignments', () => {
  const adminId = '0123456789abcdef01234567';
  const roleId = '1123456789abcdef01234567';
  assert.equal(adminRoleAssignmentRequestSchema.safeParse({
    adminId,
    roleIds: [roleId],
    version: 0,
    reason: 'Grant read access'
  }).success, true);
  assert.equal(adminRoleAssignmentRequestSchema.safeParse({
    adminId,
    roleIds: [roleId, roleId],
    version: 0,
    reason: 'Duplicate assignment attempt'
  }).success, false);
});
