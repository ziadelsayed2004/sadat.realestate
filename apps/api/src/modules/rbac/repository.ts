import { Types, type Connection } from 'mongoose';
import type {
  RbacPermission,
  RbacRoleAccessMode
} from '@sadat-real-estate/contracts';
import type { AdminModels } from '../admin/models.js';
import type { IdentityModels } from '../identity/models.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacModels } from './models.js';

export interface StoredRbacRole {
  id: string;
  name: string;
  nameKey: string;
  description?: string;
  accessMode: RbacRoleAccessMode;
  permissions: RbacPermission[];
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAuthorizationRecord {
  accountStatus: string;
  bootstrapSuperAdmin: boolean;
  roles: StoredRbacRole[];
}

export interface CreateRoleRecordInput {
  name: string;
  nameKey: string;
  description?: string;
  accessMode: RbacRoleAccessMode;
  permissions: RbacPermission[];
  actorId: string;
  reason: string;
  requestId: string;
  traceId: string;
  changedAt: Date;
}

export interface UpdateRoleRecordInput {
  roleId: string;
  expectedVersion: number;
  actorId: string;
  reason: string;
  requestId: string;
  traceId: string;
  changedAt: Date;
  before: StoredRbacRole;
  changes: {
    name?: string;
    nameKey?: string;
    description?: string | null;
    accessMode?: RbacRoleAccessMode;
    permissions?: RbacPermission[];
    active?: boolean;
  };
}

export type RoleWriteResult =
  | { kind: 'written'; role: StoredRbacRole }
  | { kind: 'name_conflict' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface SetAdminRoleAssignmentInput {
  adminId: string;
  roleIds: string[];
  actorId: string;
  expectedVersion: number;
  assignedAt: Date;
  reason: string;
  requestId: string;
  traceId: string;
}

export type AssignmentWriteResult =
  | { kind: 'written'; version: number; assignedAt: Date }
  | { kind: 'version_conflict' };

export interface RbacRepository {
  listRoles(): Promise<StoredRbacRole[]>;
  findRoleById(roleId: string): Promise<StoredRbacRole | undefined>;
  createRole(input: CreateRoleRecordInput): Promise<RoleWriteResult>;
  updateRole(input: UpdateRoleRecordInput): Promise<RoleWriteResult>;
  getAdminAuthorization(adminId: string): Promise<AdminAuthorizationRecord | undefined>;
  administratorExists(adminId: string): Promise<boolean>;
  findActiveRolesByIds(roleIds: readonly string[]): Promise<StoredRbacRole[]>;
  setAdminRoleAssignment(input: SetAdminRoleAssignmentInput): Promise<AssignmentWriteResult>;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

type LeanRole = {
  _id: Types.ObjectId;
  name: string;
  nameKey: string;
  description?: string;
  accessMode: RbacRoleAccessMode;
  permissions: RbacPermission[];
  active: boolean;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
};

function storedRole(role: LeanRole): StoredRbacRole {
  return {
    id: role._id.toHexString(),
    name: role.name,
    nameKey: role.nameKey,
    ...(role.description ? { description: role.description } : {}),
    accessMode: role.accessMode,
    permissions: [...role.permissions],
    active: role.active,
    version: role.version ?? 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

export function createMongooseRbacRepository(
  connection: Connection,
  identityModels: IdentityModels,
  adminModels: AdminModels,
  rbacModels: RbacModels,
  auditWriter: AuditWriter
): RbacRepository {
  return {
    async listRoles() {
      const roles = await rbacModels.Role.find({}).sort({ nameKey: 1 }).lean<LeanRole[]>();
      return roles.map(storedRole);
    },

    async findRoleById(roleId) {
      const role = await rbacModels.Role.findById(roleId).lean<LeanRole | null>();
      return role ? storedRole(role) : undefined;
    },

    async createRole(input) {
      try {
        return await connection.transaction(async (session) => {
          const [role] = await rbacModels.Role.create([{
            name: input.name,
            nameKey: input.nameKey,
            ...(input.description ? { description: input.description } : {}),
            accessMode: input.accessMode,
            permissions: input.permissions,
            active: true,
            createdBy: new Types.ObjectId(input.actorId),
            updatedBy: new Types.ObjectId(input.actorId),
            createdAt: input.changedAt,
            updatedAt: input.changedAt
          }], { session });
          if (!role) throw new Error('RBAC_ROLE_NOT_CREATED');
          const stored = storedRole(role.toObject() as LeanRole);
          await auditWriter.record({
            actorType: 'admin',
            actorId: input.actorId,
            targetType: 'rbac_role',
            targetId: stored.id,
            action: 'rbac.role_created',
            reason: input.reason,
            before: { exists: false },
            after: {
              accessMode: stored.accessMode,
              permissions: stored.permissions,
              active: stored.active,
              version: stored.version
            },
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: input.changedAt
          }, session);
          return { kind: 'written' as const, role: stored };
        });
      } catch (error) {
        if (isDuplicateKey(error)) return { kind: 'name_conflict' };
        throw error;
      }
    },

    async updateRole(input) {
      const set: Record<string, unknown> = {
        updatedBy: new Types.ObjectId(input.actorId)
      };
      const unset: Record<string, 1> = {};
      for (const [key, value] of Object.entries(input.changes)) {
        if (key === 'description' && value === null) unset.description = 1;
        else if (value !== undefined) set[key] = value;
      }
      try {
        const role = await connection.transaction(async (session) => {
          const updated = await rbacModels.Role.findOneAndUpdate(
            { _id: input.roleId, version: input.expectedVersion },
            {
              $set: { ...set, updatedAt: input.changedAt },
              ...(Object.keys(unset).length ? { $unset: unset } : {}),
              $inc: { version: 1 }
            },
            { new: true, runValidators: true, session }
          ).lean<LeanRole | null>();
          if (!updated) return null;
          const stored = storedRole(updated);
          await auditWriter.record({
            actorType: 'admin',
            actorId: input.actorId,
            targetType: 'rbac_role',
            targetId: input.roleId,
            action: 'rbac.role_updated',
            reason: input.reason,
            before: {
              accessMode: input.before.accessMode,
              permissions: input.before.permissions,
              active: input.before.active,
              version: input.before.version
            },
            after: {
              accessMode: stored.accessMode,
              permissions: stored.permissions,
              active: stored.active,
              version: stored.version
            },
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: input.changedAt
          }, session);
          return stored;
        });
        if (role) return { kind: 'written', role };
        return await rbacModels.Role.exists({ _id: input.roleId })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
      } catch (error) {
        if (isDuplicateKey(error)) return { kind: 'name_conflict' };
        throw error;
      }
    },

    async getAdminAuthorization(adminId) {
      const objectId = new Types.ObjectId(adminId);
      const user = await identityModels.User.findOne({
        _id: objectId,
        roleType: 'admin'
      }).select({ status: 1 }).lean<{ status: string } | null>();
      if (!user) return undefined;
      const [bootstrapSuperAdmin, assignment] = await Promise.all([
        adminModels.AdminBootstrap.exists({ userId: objectId, accessLevel: 'super_admin' }),
        rbacModels.AdminRoleAssignment.findOne({ adminUserId: objectId })
          .select({ roleIds: 1 })
          .lean<{ roleIds: Types.ObjectId[] } | null>()
      ]);
      const roles = assignment
        ? await rbacModels.Role.find({
            _id: { $in: assignment.roleIds },
            active: true
          }).sort({ nameKey: 1 }).lean<LeanRole[]>()
        : [];
      return {
        accountStatus: user.status,
        bootstrapSuperAdmin: Boolean(bootstrapSuperAdmin),
        roles: roles.map(storedRole)
      };
    },

    async administratorExists(adminId) {
      return Boolean(await identityModels.User.exists({
        _id: new Types.ObjectId(adminId),
        roleType: 'admin'
      }));
    },

    async findActiveRolesByIds(roleIds) {
      const roles = await rbacModels.Role.find({
        _id: { $in: roleIds.map((roleId) => new Types.ObjectId(roleId)) },
        active: true
      }).sort({ nameKey: 1 }).lean<LeanRole[]>();
      return roles.map(storedRole);
    },

    async setAdminRoleAssignment(input) {
      try {
        return await connection.transaction(async (session) => {
          const adminUserId = new Types.ObjectId(input.adminId);
          const current = await rbacModels.AdminRoleAssignment.findOne({ adminUserId })
            .select({ roleIds: 1, version: 1 })
            .session(session)
            .lean<{ roleIds: Types.ObjectId[]; version?: number } | null>();
          let version: number;
          let assignedAt: Date;
          let beforeRoleIds: string[];
          if (!current) {
            if (input.expectedVersion !== 0) return { kind: 'version_conflict' as const };
            const [created] = await rbacModels.AdminRoleAssignment.create([{
              adminUserId,
              roleIds: input.roleIds.map((roleId) => new Types.ObjectId(roleId)),
              assignedBy: new Types.ObjectId(input.actorId),
              assignedAt: input.assignedAt,
              createdAt: input.assignedAt,
              updatedAt: input.assignedAt
            }], { session });
            if (!created) throw new Error('RBAC_ASSIGNMENT_NOT_CREATED');
            version = created.get('version') as number;
            assignedAt = created.assignedAt;
            beforeRoleIds = [];
          } else {
            const assignment = await rbacModels.AdminRoleAssignment.findOneAndUpdate(
              { adminUserId, version: input.expectedVersion },
              {
                $set: {
                  roleIds: input.roleIds.map((roleId) => new Types.ObjectId(roleId)),
                  assignedBy: new Types.ObjectId(input.actorId),
                  assignedAt: input.assignedAt,
                  updatedAt: input.assignedAt
                },
                $inc: { version: 1 }
              },
              { new: true, runValidators: true, session }
            ).lean<{ version?: number; assignedAt: Date } | null>();
            if (!assignment) return { kind: 'version_conflict' as const };
            version = assignment.version ?? input.expectedVersion + 1;
            assignedAt = assignment.assignedAt;
            beforeRoleIds = current.roleIds.map((roleId) => roleId.toHexString());
          }
          await auditWriter.record({
            actorType: 'admin',
            actorId: input.actorId,
            targetType: 'admin_role_assignment',
            targetId: input.adminId,
            action: 'rbac.roles_assigned',
            reason: input.reason,
            before: { roleIds: beforeRoleIds, version: input.expectedVersion },
            after: { roleIds: input.roleIds, version },
            requestId: input.requestId,
            traceId: input.traceId,
            occurredAt: input.assignedAt
          }, session);
          return { kind: 'written' as const, version, assignedAt };
        });
      } catch (error) {
        if (isDuplicateKey(error)) return { kind: 'version_conflict' };
        throw error;
      }
    }
  };
}
