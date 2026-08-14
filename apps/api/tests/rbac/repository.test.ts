import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import type { Connection } from 'mongoose';
import type { AdminModels } from '../../src/modules/admin/models.js';
import type { IdentityModels } from '../../src/modules/identity/models.js';
import type { RbacModels } from '../../src/modules/rbac/models.js';
import { createMongooseRbacRepository } from '../../src/modules/rbac/repository.js';
import type { AuditRecordInput, AuditWriter } from '../../src/modules/audit/writer.js';

const actorId = '0123456789abcdef01234567';
const roleId = '1123456789abcdef01234567';
const createdAt = new Date('2026-08-13T18:30:00.000Z');

function transactionalConnection(): Connection {
  return {
    async transaction<T>(work: (session: never) => Promise<T>) {
      return work({ id: 'test-session' } as never);
    }
  } as unknown as Connection;
}

function auditWriter(records: AuditRecordInput[] = []): AuditWriter {
  return {
    async record(input) {
      records.push(input);
      return '9123456789abcdef01234567';
    }
  };
}

function unusedIdentityModels(): IdentityModels {
  return {} as IdentityModels;
}

function unusedAdminModels(): AdminModels {
  return {} as AdminModels;
}

test('maps a newly created role to an explicit safe repository projection', async () => {
  const Role = {
    async create(rows: Record<string, unknown>[]) {
      const input = rows[0]!;
      assert.equal(input.createdBy instanceof mongoose.Types.ObjectId, true);
      return [{
        toObject() {
          return {
            _id: new mongoose.Types.ObjectId(roleId),
            name: input.name,
            nameKey: input.nameKey,
            accessMode: input.accessMode,
            permissions: input.permissions,
            active: input.active,
            version: 0,
            createdAt,
            updatedAt: createdAt
          };
        }
      }];
    }
  };
  const audits: AuditRecordInput[] = [];
  const repository = createMongooseRbacRepository(
    transactionalConnection(),
    unusedIdentityModels(),
    unusedAdminModels(),
    { Role } as unknown as RbacModels,
    auditWriter(audits)
  );
  const result = await repository.createRole({
    name: 'Role Manager',
    nameKey: 'role manager',
    accessMode: 'custom',
    permissions: ['admin:roles.view', 'admin:roles.manage'],
    actorId,
    reason: 'Create role management capability',
    requestId: 'rbac-repository-1',
    traceId: 'a'.repeat(32),
    changedAt: createdAt
  });
  assert.equal(result.kind, 'written');
  if (result.kind === 'written') {
    assert.equal(result.role.id, roleId);
    assert.equal('createdBy' in result.role, false);
  }
  assert.equal(audits[0]?.action, 'rbac.role_created');
});

test('classifies duplicate names and optimistic update conflicts without hiding failures', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 11000 });
  const duplicateRepository = createMongooseRbacRepository(
    transactionalConnection(),
    unusedIdentityModels(),
    unusedAdminModels(),
    { Role: { async create() { throw duplicate; } } } as unknown as RbacModels,
    auditWriter()
  );
  assert.deepEqual(await duplicateRepository.createRole({
    name: 'Duplicate',
    nameKey: 'duplicate',
    accessMode: 'custom',
    permissions: ['admin:roles.view'],
    actorId,
    reason: 'Attempt duplicate role creation',
    requestId: 'rbac-repository-2',
    traceId: 'b'.repeat(32),
    changedAt: createdAt
  }), { kind: 'name_conflict' });

  const conflictRepository = createMongooseRbacRepository(
    transactionalConnection(),
    unusedIdentityModels(),
    unusedAdminModels(),
    {
      Role: {
        findOneAndUpdate() { return { async lean() { return null; } }; },
        async exists() { return { _id: roleId }; }
      }
    } as unknown as RbacModels,
    auditWriter()
  );
  assert.deepEqual(await conflictRepository.updateRole({
    roleId,
    expectedVersion: 4,
    actorId,
    reason: 'Deactivate stale role',
    requestId: 'rbac-repository-3',
    traceId: 'c'.repeat(32),
    changedAt: createdAt,
    before: {
      id: roleId,
      name: 'Role Manager',
      nameKey: 'role manager',
      accessMode: 'custom',
      permissions: ['admin:roles.view'],
      active: true,
      version: 4,
      createdAt,
      updatedAt: createdAt
    },
    changes: { active: false }
  }), { kind: 'version_conflict' });
});
