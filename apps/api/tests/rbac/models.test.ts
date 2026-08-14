import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { createRbacModels } from '../../src/modules/rbac/models.js';

const actorId = new mongoose.Types.ObjectId();

test('registers strict role and assignment models with query-driven unique indexes', async () => {
  const connection = mongoose.createConnection();
  const first = createRbacModels(connection);
  const second = createRbacModels(connection);
  assert.equal(first.Role, second.Role);
  assert.equal(first.AdminRoleAssignment, second.AdminRoleAssignment);

  const roleIndexes = new Map(
    first.Role.schema.indexes().map(([keys, options]) => [options.name, { keys, options }])
  );
  assert.equal(roleIndexes.get('roles_name_key_unique')?.options.unique, true);
  assert.deepEqual(roleIndexes.get('roles_active_name')?.keys, { active: 1, nameKey: 1 });
  const assignmentIndexes = new Map(
    first.AdminRoleAssignment.schema.indexes()
      .map(([keys, options]) => [options.name, { keys, options }])
  );
  assert.equal(assignmentIndexes.get('admin_role_assignments_admin_unique')?.options.unique, true);
  assert.deepEqual(assignmentIndexes.get('admin_role_assignments_roles_updated')?.keys, {
    roleIds: 1,
    updatedAt: -1
  });
  await connection.close();
});

test('validates View Only roles at the persistence boundary', async () => {
  const connection = mongoose.createConnection();
  const { Role } = createRbacModels(connection);
  await new Role({
    name: 'View Only',
    nameKey: 'view only',
    accessMode: 'view_only',
    permissions: ['admin:roles.view'],
    createdBy: actorId,
    updatedBy: actorId
  }).validate();
  await assert.rejects(new Role({
    name: 'Unsafe View Only',
    nameKey: 'unsafe view only',
    accessMode: 'view_only',
    permissions: ['admin:roles.manage'],
    createdBy: actorId,
    updatedBy: actorId
  }).validate());
  assert.throws(() => new Role({
    name: 'Loose',
    nameKey: 'loose',
    accessMode: 'custom',
    permissions: ['admin:roles.view'],
    createdBy: actorId,
    updatedBy: actorId,
    wildcard: true
  }), /strict mode/);
  await connection.close();
});

test('rejects empty, duplicate, and oversized administrator role assignments', async () => {
  const connection = mongoose.createConnection();
  const { AdminRoleAssignment } = createRbacModels(connection);
  const common = {
    adminUserId: new mongoose.Types.ObjectId(),
    assignedBy: actorId,
    assignedAt: new Date('2026-08-13T18:30:00.000Z')
  };
  await assert.rejects(new AdminRoleAssignment({ ...common, roleIds: [] }).validate());
  const duplicate = new mongoose.Types.ObjectId();
  await assert.rejects(new AdminRoleAssignment({
    ...common,
    roleIds: [duplicate, duplicate]
  }).validate());
  await connection.close();
});
