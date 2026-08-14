import assert from 'node:assert/strict';
import test from 'node:test';
import { RBAC_PERMISSIONS } from '@sadat-real-estate/contracts';
import type {
  AdminAuthorizationRecord,
  AssignmentWriteResult,
  CreateRoleRecordInput,
  RbacRepository,
  RoleWriteResult,
  SetAdminRoleAssignmentInput,
  StoredRbacRole,
  UpdateRoleRecordInput
} from '../../src/modules/rbac/repository.js';
import { RbacServiceError, createRbacService } from '../../src/modules/rbac/service.js';
import {
  ObjectAuthorizationError,
  deriveAvailableActions,
  isObjectActionAllowed,
  requireObjectAction,
  type ObjectActionRule,
  type ObjectAuthorizationContext
} from '../../src/modules/rbac/policy.js';

const superAdminId = '0123456789abcdef01234567';
const viewerId = '1123456789abcdef01234567';
const managerId = '2123456789abcdef01234567';
const targetAdminId = '3123456789abcdef01234567';
const roleId = '4123456789abcdef01234567';
const viewerRoleId = '5123456789abcdef01234567';
const timestamp = new Date('2026-08-13T18:30:00.000Z');
const mutationContext = { requestId: 'rbac-test-1', traceId: 'a'.repeat(32) };

function storedRole(overrides: Partial<StoredRbacRole> = {}): StoredRbacRole {
  return {
    id: roleId,
    name: 'Role Managers',
    nameKey: 'role managers',
    accessMode: 'custom',
    permissions: ['admin:roles.view', 'admin:roles.manage', 'admin:staff.manage'],
    active: true,
    version: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

class MemoryRepository implements RbacRepository {
  roles = new Map<string, StoredRbacRole>([
    [roleId, storedRole()],
    [viewerRoleId, storedRole({
      id: viewerRoleId,
      name: 'View Only',
      nameKey: 'view only',
      accessMode: 'view_only',
      permissions: ['admin:roles.view']
    })]
  ]);
  authorizations = new Map<string, AdminAuthorizationRecord>([
    [superAdminId, { accountStatus: 'verified', bootstrapSuperAdmin: true, roles: [] }],
    [viewerId, {
      accountStatus: 'verified', bootstrapSuperAdmin: false,
      roles: [this.roles.get(viewerRoleId)!]
    }],
    [managerId, {
      accountStatus: 'verified', bootstrapSuperAdmin: false,
      roles: [this.roles.get(roleId)!]
    }],
    [targetAdminId, { accountStatus: 'verified', bootstrapSuperAdmin: false, roles: [] }]
  ]);
  administrators = new Set([superAdminId, viewerId, managerId, targetAdminId]);
  nextRoleWrite?: RoleWriteResult;
  nextAssignmentWrite?: AssignmentWriteResult;

  async listRoles() { return [...this.roles.values()]; }
  async findRoleById(id: string) { return this.roles.get(id); }
  async createRole(input: CreateRoleRecordInput) {
    if (this.nextRoleWrite) return this.nextRoleWrite;
    const role = storedRole({
      id: '6123456789abcdef01234567',
      name: input.name,
      nameKey: input.nameKey,
      ...(input.description ? { description: input.description } : {}),
      accessMode: input.accessMode,
      permissions: input.permissions
    });
    this.roles.set(role.id, role);
    return { kind: 'written', role } as const;
  }
  async updateRole(input: UpdateRoleRecordInput) {
    if (this.nextRoleWrite) return this.nextRoleWrite;
    const current = this.roles.get(input.roleId);
    if (!current) return { kind: 'not_found' } as const;
    const role = {
      ...current,
      ...input.changes,
      description: input.changes.description === null
        ? undefined
        : input.changes.description ?? current.description,
      version: current.version + 1,
      updatedAt: timestamp
    } as StoredRbacRole;
    this.roles.set(role.id, role);
    return { kind: 'written', role } as const;
  }
  async getAdminAuthorization(adminId: string) { return this.authorizations.get(adminId); }
  async administratorExists(adminId: string) { return this.administrators.has(adminId); }
  async findActiveRolesByIds(ids: readonly string[]) {
    return ids.flatMap((id) => {
      const role = this.roles.get(id);
      return role?.active ? [role] : [];
    });
  }
  async setAdminRoleAssignment(input: SetAdminRoleAssignmentInput) {
    if (this.nextAssignmentWrite) return this.nextAssignmentWrite;
    this.authorizations.set(input.adminId, {
      accountStatus: 'verified',
      bootstrapSuperAdmin: false,
      roles: input.roleIds.map((id) => this.roles.get(id)!).filter(Boolean)
    });
    return { kind: 'written', version: input.expectedVersion, assignedAt: input.assignedAt } as const;
  }
}

function code(expected: string) {
  return (error: unknown) => error instanceof RbacServiceError && error.code === expected;
}

type ExampleAction = 'edit' | 'submit' | 'review' | 'follow_up' | 'publish';

const OBJECT_RULES: readonly ObjectActionRule<ExampleAction>[] = [
  {
    action: 'edit', roles: ['provider'], states: ['draft', 'needs_information'], scopes: ['owner']
  },
  {
    action: 'submit', roles: ['provider'], states: ['draft'], scopes: ['owner']
  },
  {
    action: 'review', roles: ['admin'], permission: 'admin:documents.review',
    states: ['pending_review'], scopes: ['review_scope']
  },
  {
    action: 'follow_up', roles: ['admin'], permission: 'admin:requests.manage',
    states: ['new', 'follow_up'], scopes: ['assigned']
  },
  {
    action: 'publish', roles: ['admin'], permission: 'admin:content.publish',
    states: ['approved'], scopes: ['global']
  }
];

function objectContext(
  overrides: Partial<ObjectAuthorizationContext> = {}
): ObjectAuthorizationContext {
  return {
    principal: {
      actorId: managerId,
      role: 'provider',
      permissions: []
    },
    resource: {
      state: 'draft',
      ownerId: managerId
    },
    ...overrides
  };
}

test('derives owner actions from the same stateful policy used for enforcement', () => {
  const context = objectContext();
  assert.deepEqual(deriveAvailableActions(context, OBJECT_RULES), ['edit', 'submit']);
  assert.equal(isObjectActionAllowed(context, OBJECT_RULES, 'edit'), true);
  requireObjectAction(context, OBJECT_RULES, 'submit');

  const wrongOwner = objectContext({
    resource: { state: 'draft', ownerId: targetAdminId }
  });
  assert.deepEqual(deriveAvailableActions(wrongOwner, OBJECT_RULES), []);
  assert.throws(
    () => requireObjectAction(wrongOwner, OBJECT_RULES, 'edit'),
    (error) => error instanceof ObjectAuthorizationError
      && error.code === 'RBAC_OBJECT_FORBIDDEN'
  );
});

test('requires both permission and assignment or review scope for Admin object actions', () => {
  const reviewer = objectContext({
    principal: {
      actorId: managerId,
      role: 'admin',
      permissions: ['admin:documents.review'],
      reviewScopeIds: ['providers:cairo']
    },
    resource: {
      state: 'pending_review',
      reviewScopeIds: ['providers:cairo']
    }
  });
  assert.deepEqual(deriveAvailableActions(reviewer, OBJECT_RULES), ['review']);

  assert.deepEqual(deriveAvailableActions({
    ...reviewer,
    principal: { ...reviewer.principal, reviewScopeIds: ['providers:alexandria'] }
  }, OBJECT_RULES), []);
  assert.deepEqual(deriveAvailableActions({
    ...reviewer,
    principal: { ...reviewer.principal, permissions: [] }
  }, OBJECT_RULES), []);

  const assigned = objectContext({
    principal: {
      actorId: managerId,
      role: 'admin',
      permissions: ['admin:requests.manage']
    },
    resource: {
      state: 'new',
      assignedActorIds: [managerId]
    }
  });
  assert.equal(isObjectActionAllowed(assigned, OBJECT_RULES, 'follow_up'), true);
  assert.equal(isObjectActionAllowed({
    ...assigned,
    resource: { state: 'new', assignedActorIds: [targetAdminId] }
  }, OBJECT_RULES, 'follow_up'), false);
});

test('allows global object actions only when the rule and Admin capability are explicit', () => {
  const publisher = objectContext({
    principal: {
      actorId: managerId,
      role: 'admin',
      permissions: ['admin:content.publish']
    },
    resource: { state: 'approved' }
  });
  assert.deepEqual(deriveAvailableActions(publisher, OBJECT_RULES), ['publish']);

  const unsafeRule: readonly ObjectActionRule<'publish'>[] = [{
    action: 'publish', roles: ['admin'], states: ['approved'], scopes: ['global']
  }];
  assert.deepEqual(deriveAvailableActions(publisher, unsafeRule), []);
  assert.deepEqual(deriveAvailableActions({
    ...publisher,
    resource: { state: 'draft' }
  }, OBJECT_RULES), []);
});

test('resolves the immutable bootstrap guard to the complete catalog without persisted wildcards', async () => {
  const service = createRbacService({ repository: new MemoryRepository() });
  const authorization = await service.authorizationFor(superAdminId);
  assert.equal(authorization.isSuperAdmin, true);
  assert.deepEqual(authorization.permissions, [...RBAC_PERMISSIONS]);
  assert.equal(authorization.permissions.some((permission) => permission.includes('*')), false);
});

test('enforces View Only at the API service boundary and returns no mutation action', async () => {
  const service = createRbacService({ repository: new MemoryRepository() });
  const listed = await service.listRoles({ userId: viewerId });
  assert.equal(listed.items.every((role) => role.availableActions.length === 0), true);
  await assert.rejects(service.createRole({ userId: viewerId }, {
    name: 'Not Allowed',
    accessMode: 'custom',
    permissions: ['admin:roles.view'],
    reason: 'Viewer attempted role creation'
  }, mutationContext), code('RBAC_FORBIDDEN'));
});

test('creates normalized dynamic roles and classifies duplicate names', async () => {
  const repository = new MemoryRepository();
  const service = createRbacService({ repository });
  const created = await service.createRole({ userId: managerId }, {
    name: '  Property Reviewers  ',
    accessMode: 'custom',
    permissions: ['admin:properties.review', 'admin:properties.view'],
    reason: 'Create property review team role'
  }, mutationContext);
  assert.equal(created.name, 'Property Reviewers');
  assert.deepEqual(created.availableActions, ['update']);
  repository.nextRoleWrite = { kind: 'name_conflict' };
  await assert.rejects(service.createRole({ userId: managerId }, {
    name: 'Property Reviewers',
    accessMode: 'custom',
    permissions: ['admin:properties.view'],
    reason: 'Attempt duplicate property review role'
  }, mutationContext), code('RBAC_ROLE_NAME_EXISTS'));
});

test('rejects unsafe View Only transitions and stale role versions', async () => {
  const repository = new MemoryRepository();
  const service = createRbacService({ repository });
  await assert.rejects(service.updateRole({ userId: managerId }, roleId, {
    version: 0,
    accessMode: 'view_only',
    reason: 'Convert role to view-only access'
  }, mutationContext), code('RBAC_VIEW_ONLY_PERMISSION_INVALID'));
  repository.nextRoleWrite = { kind: 'version_conflict' };
  await assert.rejects(service.updateRole({ userId: managerId }, roleId, {
    version: 9,
    active: false,
    reason: 'Deactivate stale role version'
  }, mutationContext), code('RBAC_ROLE_VERSION_CONFLICT'));
});

test('assigns only active known roles to administrators with optimistic concurrency', async () => {
  const repository = new MemoryRepository();
  const service = createRbacService({ repository, now: () => timestamp });
  const assignment = await service.assignRoles({ userId: managerId }, {
    adminId: targetAdminId,
    roleIds: [viewerRoleId],
    version: 0,
    reason: 'Grant audit-safe read access'
  }, mutationContext);
  assert.deepEqual(assignment.effectivePermissions, ['admin:roles.view']);
  assert.equal(assignment.assignedAt, timestamp.toISOString());

  await assert.rejects(service.assignRoles({ userId: managerId }, {
    adminId: '7123456789abcdef01234567',
    roleIds: [viewerRoleId],
    version: 0,
    reason: 'Attempt assignment to missing administrator'
  }, mutationContext), code('RBAC_ASSIGNMENT_TARGET_NOT_ADMIN'));
  await assert.rejects(service.assignRoles({ userId: managerId }, {
    adminId: targetAdminId,
    roleIds: ['8123456789abcdef01234567'],
    version: 0,
    reason: 'Attempt unknown role assignment'
  }, mutationContext), code('RBAC_ASSIGNMENT_ROLE_INVALID'));
  repository.nextAssignmentWrite = { kind: 'version_conflict' };
  await assert.rejects(service.assignRoles({ userId: managerId }, {
    adminId: targetAdminId,
    roleIds: [viewerRoleId],
    version: 0,
    reason: 'Attempt stale assignment update'
  }, mutationContext), code('RBAC_ASSIGNMENT_VERSION_CONFLICT'));
});

test('fails closed for missing, suspended, or unassigned administrator authorization', async () => {
  const repository = new MemoryRepository();
  repository.authorizations.set(targetAdminId, {
    accountStatus: 'suspended',
    bootstrapSuperAdmin: false,
    roles: [storedRole()]
  });
  const service = createRbacService({ repository });
  assert.equal(await service.authorize(targetAdminId, 'admin:roles.view'), false);
  assert.equal(await service.authorize('9123456789abcdef01234567', 'admin:roles.view'), false);
});
