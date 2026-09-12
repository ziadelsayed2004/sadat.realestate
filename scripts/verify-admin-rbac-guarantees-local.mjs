import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createMongooseAdministratorRepository } from '../apps/api/src/modules/admin/administrator-repository.ts';
import { createAdminModels } from '../apps/api/src/modules/admin/models.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createRbacModels } from '../apps/api/src/modules/rbac/models.ts';
import { createMongooseRbacRepository } from '../apps/api/src/modules/rbac/repository.ts';

const database = `admin_rbac_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const reportPath = 'docs/quality/guide-runs/admin-rbac-guarantees-local-latest.json';
const report = {
  status: 'RUNNING', journey: 'GUIDE-26', journeys: ['GUIDE-26'], mockedRoutes: false,
  environment: 'isolated-local-MongoDB',
  faultInjection: 'durable audit throws after insert inside administrator, role, and assignment transactions',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), checks: [], cleanup: false
};

try {
  const identity = createIdentityModels(connection);
  const admin = createAdminModels(connection);
  const rbac = createRbacModels(connection);
  const audits = createAuditModels(connection);
  await Promise.all([identity.User.init(), identity.AdminProfile.init(), admin.AdminAccount.init(), rbac.Role.init(), rbac.AdminRoleAssignment.init(), audits.AuditLog.init()]);
  const durable = createMongooseAuditWriter(audits);
  let failAudit = true;
  const audit = {
    async record(entry, session) {
      const id = await durable.record(entry, session);
      if (failAudit) throw new Error('INJECTED_ADMIN_RBAC_AUDIT_FAILURE');
      return id;
    }
  };
  const administrators = createMongooseAdministratorRepository({ connection, identityModels: identity, adminModels: admin, auditWriter: audit });
  const actorId = new mongoose.Types.ObjectId().toHexString();
  const adminInput = {
    actorId, data: { email: 'guide26.atomic@example.invalid', displayName: 'Atomic Administrator', accessLevel: 'standard_admin' },
    now: '2026-09-13T10:00:00.000Z', requestId: 'guide26-admin-create', traceId: 'a'.repeat(32)
  };

  await assert.rejects(administrators.create(adminInput), /INJECTED_ADMIN_RBAC_AUDIT_FAILURE/u);
  assert.equal(await connection.collection('users').countDocuments(), 0);
  assert.equal(await connection.collection('admin_accounts').countDocuments(), 0);
  assert.equal(await connection.collection('audit_logs').countDocuments(), 0);
  report.checks.push('audit_failure_rolls_back_administrator_identity_account_and_audit');

  failAudit = false;
  const createdAdmin = await administrators.create({ ...adminInput, requestId: 'guide26-admin-create-retry' });
  assert.equal(createdAdmin.kind, 'created');
  const administrator = createdAdmin.administrator;
  assert.equal(await audits.AuditLog.countDocuments({ targetId: administrator.id, action: 'admin.administrator_created' }), 1);
  report.checks.push('administrator_create_retry_commits_once');

  failAudit = true;
  await assert.rejects(administrators.update({
    actorId, id: administrator.id, expectedVersion: 0,
    patch: { expectedVersion: 0, reason: 'Atomic administrator update', displayName: 'Changed Administrator' },
    now: '2026-09-13T10:01:00.000Z', requestId: 'guide26-admin-update', traceId: 'b'.repeat(32)
  }), /INJECTED_ADMIN_RBAC_AUDIT_FAILURE/u);
  const rolledBackAdmin = await administrators.findById(administrator.id);
  assert.equal(rolledBackAdmin?.displayName, 'Atomic Administrator');
  assert.equal(rolledBackAdmin?.version, 0);
  assert.equal(await audits.AuditLog.countDocuments({ targetId: administrator.id }), 1);
  report.checks.push('audit_failure_rolls_back_administrator_values_version_and_update_audit');

  const roles = createMongooseRbacRepository(connection, identity, admin, rbac, audit);
  const roleInput = {
    name: 'GUIDE-26 Atomic Role', nameKey: 'guide-26 atomic role', description: 'Atomic verification',
    accessMode: 'view_only', permissions: ['admin:staff.view'], actorId,
    reason: 'Create atomic role', requestId: 'guide26-role-create', traceId: 'c'.repeat(32), changedAt: new Date('2026-09-13T10:02:00.000Z')
  };
  await assert.rejects(roles.createRole(roleInput), /INJECTED_ADMIN_RBAC_AUDIT_FAILURE/u);
  assert.equal(await connection.collection('roles').countDocuments(), 0);
  assert.equal(await audits.AuditLog.countDocuments({ targetType: 'rbac_role' }), 0);
  report.checks.push('audit_failure_rolls_back_role_creation_and_audit');

  failAudit = false;
  const createdRole = await roles.createRole({ ...roleInput, requestId: 'guide26-role-create-retry' });
  assert.equal(createdRole.kind, 'written');
  const role = createdRole.role;
  assert.equal(await audits.AuditLog.countDocuments({ targetId: role.id, action: 'rbac.role_created' }), 1);
  report.checks.push('role_create_retry_commits_once');

  failAudit = true;
  await assert.rejects(roles.updateRole({
    roleId: role.id, expectedVersion: 0, actorId, reason: 'Atomic role update',
    requestId: 'guide26-role-update', traceId: 'd'.repeat(32), changedAt: new Date('2026-09-13T10:03:00.000Z'),
    before: role, changes: { description: 'Changed role' }
  }), /INJECTED_ADMIN_RBAC_AUDIT_FAILURE/u);
  const rolledBackRole = await roles.findRoleById(role.id);
  assert.equal(rolledBackRole?.description, 'Atomic verification');
  assert.equal(rolledBackRole?.version, 0);
  assert.equal(await audits.AuditLog.countDocuments({ targetId: role.id }), 1);
  report.checks.push('audit_failure_rolls_back_role_values_version_and_update_audit');

  await assert.rejects(roles.setAdminRoleAssignment({
    adminId: administrator.id, roleIds: [role.id], actorId, expectedVersion: 0,
    assignedAt: new Date('2026-09-13T10:04:00.000Z'), reason: 'Atomic assignment',
    requestId: 'guide26-assignment', traceId: 'e'.repeat(32)
  }), /INJECTED_ADMIN_RBAC_AUDIT_FAILURE/u);
  assert.equal(await connection.collection('admin_role_assignments').countDocuments(), 0);
  assert.equal(await audits.AuditLog.countDocuments({ targetType: 'admin_role_assignment' }), 0);
  report.checks.push('audit_failure_rolls_back_role_assignment_and_audit');

  failAudit = false;
  const assignment = await roles.setAdminRoleAssignment({
    adminId: administrator.id, roleIds: [role.id], actorId, expectedVersion: 0,
    assignedAt: new Date('2026-09-13T10:04:00.000Z'), reason: 'Atomic assignment retry',
    requestId: 'guide26-assignment-retry', traceId: 'f'.repeat(32)
  });
  assert.equal(assignment.kind, 'written');
  assert.equal(await audits.AuditLog.countDocuments({ targetType: 'admin_role_assignment', targetId: administrator.id }), 1);
  report.checks.push('role_assignment_retry_commits_once');

  report.status = 'PASS_LOCAL';
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.error = error instanceof Error ? error.stack ?? error.message : String(error);
  throw error;
} finally {
  try {
    await connection.dropDatabase();
    report.cleanup = true;
  } finally {
    await connection.close();
    report.finishedAt = new Date().toISOString();
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
}

console.log(`GUIDE-26 admin/RBAC guarantees: ${report.status} (${report.checks.length} checks, cleanup=${report.cleanup})`);
