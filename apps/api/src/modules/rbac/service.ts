import {
  adminRoleAssignmentRequestSchema,
  RBAC_PERMISSIONS,
  rbacObjectIdSchema,
  rbacPermissionSchema,
  rbacRoleCreateRequestSchema,
  rbacRolePatchRequestSchema,
  type AdminRoleAssignmentData,
  type AdminRoleAssignmentRequest,
  type RbacPermission,
  type RbacRoleCreateRequest,
  type RbacRoleData,
  type RbacRoleListData,
  type RbacRolePatchRequest
} from '@sadat-real-estate/contracts';
import type { RbacRepository, StoredRbacRole } from './repository.js';
import {
  deriveAvailableActions,
  type ObjectActionRule,
  type ObjectAuthorizationPrincipal
} from './policy.js';

export type RbacServiceErrorCode =
  | 'RBAC_FORBIDDEN'
  | 'RBAC_ROLE_NOT_FOUND'
  | 'RBAC_ROLE_NAME_EXISTS'
  | 'RBAC_ROLE_VERSION_CONFLICT'
  | 'RBAC_VIEW_ONLY_PERMISSION_INVALID'
  | 'RBAC_ASSIGNMENT_TARGET_NOT_ADMIN'
  | 'RBAC_ASSIGNMENT_ROLE_INVALID'
  | 'RBAC_ASSIGNMENT_VERSION_CONFLICT';

export class RbacServiceError extends Error {
  readonly code: RbacServiceErrorCode;

  constructor(code: RbacServiceErrorCode) {
    super(code);
    this.name = 'RbacServiceError';
    this.code = code;
  }
}

export interface RbacPrincipal {
  userId: string;
}

export interface RbacMutationContext {
  requestId: string;
  traceId: string;
}

export interface EffectiveAuthorization {
  isSuperAdmin: boolean;
  permissions: RbacPermission[];
}

export interface RbacService {
  authorizationFor(adminId: string): Promise<EffectiveAuthorization>;
  authorize(adminId: string, permission: RbacPermission): Promise<boolean>;
  listRoles(principal: RbacPrincipal): Promise<RbacRoleListData>;
  createRole(
    principal: RbacPrincipal,
    input: RbacRoleCreateRequest,
    context: RbacMutationContext
  ): Promise<RbacRoleData>;
  updateRole(
    principal: RbacPrincipal,
    roleId: string,
    input: RbacRolePatchRequest,
    context: RbacMutationContext
  ): Promise<RbacRoleData>;
  assignRoles(
    principal: RbacPrincipal,
    input: AdminRoleAssignmentRequest,
    context: RbacMutationContext
  ): Promise<AdminRoleAssignmentData>;
}

export interface RbacServiceDependencies {
  repository: RbacRepository;
  now?: () => Date;
}

function normalizedNameKey(name: string): string {
  return name.trim().normalize('NFKC').toLocaleLowerCase('en-US');
}

function sortedPermissions(permissions: readonly RbacPermission[]): RbacPermission[] {
  return [...permissions].sort((left, right) => left.localeCompare(right, 'en'));
}

function effectivePermissions(roles: readonly StoredRbacRole[]): RbacPermission[] {
  return sortedPermissions([...new Set(roles.flatMap((role) => role.permissions))]);
}

const ROLE_ACTION_RULES: readonly ObjectActionRule<RbacRoleData['availableActions'][number]>[] = [
  {
    action: 'update',
    roles: ['admin'],
    permission: 'admin:roles.manage',
    states: ['active', 'inactive'],
    scopes: ['global']
  }
];

function roleData(
  role: StoredRbacRole,
  actorId: string,
  authorization: EffectiveAuthorization
): RbacRoleData {
  const principal: ObjectAuthorizationPrincipal = {
    actorId,
    role: 'admin',
    permissions: authorization.permissions
  };
  return {
    id: role.id,
    name: role.name,
    ...(role.description ? { description: role.description } : {}),
    accessMode: role.accessMode,
    permissions: sortedPermissions(role.permissions),
    active: role.active,
    version: role.version,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    availableActions: deriveAvailableActions(
      {
        principal,
        resource: { state: role.active ? 'active' : 'inactive' }
      },
      ROLE_ACTION_RULES
    )
  };
}

function isViewOnlyValid(accessMode: string, permissions: readonly string[]): boolean {
  return accessMode !== 'view_only'
    || permissions.every((permission) => permission.endsWith('.view'));
}

export function createRbacService(dependencies: RbacServiceDependencies): RbacService {
  const now = dependencies.now ?? (() => new Date());

  async function authorizationFor(adminId: string): Promise<EffectiveAuthorization> {
    rbacObjectIdSchema.parse(adminId);
    const record = await dependencies.repository.getAdminAuthorization(adminId);
    if (!record || record.accountStatus !== 'verified') {
      return { isSuperAdmin: false, permissions: [] };
    }
    return record.bootstrapSuperAdmin
      ? { isSuperAdmin: true, permissions: [...RBAC_PERMISSIONS] }
      : { isSuperAdmin: false, permissions: effectivePermissions(record.roles) };
  }

  async function requirePermission(adminId: string, permission: RbacPermission) {
    const authorization = await authorizationFor(adminId);
    if (!authorization.permissions.includes(permission)) {
      throw new RbacServiceError('RBAC_FORBIDDEN');
    }
    return authorization;
  }

  return {
    authorizationFor,

    async authorize(adminId, permission) {
      rbacPermissionSchema.parse(permission);
      const authorization = await authorizationFor(adminId);
      return authorization.permissions.includes(permission);
    },

    async listRoles(principal) {
      const authorization = await requirePermission(principal.userId, 'admin:roles.view');
      return {
        items: (await dependencies.repository.listRoles())
          .map((role) => roleData(role, principal.userId, authorization)),
        permissionCatalog: [...RBAC_PERMISSIONS],
        effectivePermissions: authorization.permissions
      };
    },

    async createRole(principal, unparsedInput, context) {
      const input = rbacRoleCreateRequestSchema.parse(unparsedInput);
      const authorization = await requirePermission(principal.userId, 'admin:roles.manage');
      const changedAt = now();
      const result = await dependencies.repository.createRole({
        name: input.name,
        nameKey: normalizedNameKey(input.name),
        ...(input.description ? { description: input.description } : {}),
        accessMode: input.accessMode,
        permissions: sortedPermissions(input.permissions),
        actorId: principal.userId,
        reason: input.reason,
        requestId: context.requestId,
        traceId: context.traceId,
        changedAt
      });
      if (result.kind === 'name_conflict') {
        throw new RbacServiceError('RBAC_ROLE_NAME_EXISTS');
      }
      if (result.kind !== 'written') throw new Error('Unexpected RBAC role creation result');
      return roleData(result.role, principal.userId, authorization);
    },

    async updateRole(principal, roleId, unparsedInput, context) {
      rbacObjectIdSchema.parse(roleId);
      const input = rbacRolePatchRequestSchema.parse(unparsedInput);
      const authorization = await requirePermission(principal.userId, 'admin:roles.manage');
      const current = await dependencies.repository.findRoleById(roleId);
      if (!current) throw new RbacServiceError('RBAC_ROLE_NOT_FOUND');
      const nextAccessMode = input.accessMode ?? current.accessMode;
      const nextPermissions = input.permissions ?? current.permissions;
      if (!isViewOnlyValid(nextAccessMode, nextPermissions)) {
        throw new RbacServiceError('RBAC_VIEW_ONLY_PERMISSION_INVALID');
      }
      const result = await dependencies.repository.updateRole({
        roleId,
        expectedVersion: input.version,
        actorId: principal.userId,
        reason: input.reason,
        requestId: context.requestId,
        traceId: context.traceId,
        changedAt: now(),
        before: current,
        changes: {
          ...(input.name !== undefined
            ? { name: input.name, nameKey: normalizedNameKey(input.name) }
            : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.accessMode !== undefined ? { accessMode: input.accessMode } : {}),
          ...(input.permissions !== undefined
            ? { permissions: sortedPermissions(input.permissions) }
            : {}),
          ...(input.active !== undefined ? { active: input.active } : {})
        }
      });
      if (result.kind === 'name_conflict') {
        throw new RbacServiceError('RBAC_ROLE_NAME_EXISTS');
      }
      if (result.kind === 'not_found') throw new RbacServiceError('RBAC_ROLE_NOT_FOUND');
      if (result.kind === 'version_conflict') {
        throw new RbacServiceError('RBAC_ROLE_VERSION_CONFLICT');
      }
      return roleData(result.role, principal.userId, authorization);
    },

    async assignRoles(principal, unparsedInput, context) {
      const input = adminRoleAssignmentRequestSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:staff.manage');
      if (!await dependencies.repository.administratorExists(input.adminId)) {
        throw new RbacServiceError('RBAC_ASSIGNMENT_TARGET_NOT_ADMIN');
      }
      const roles = await dependencies.repository.findActiveRolesByIds(input.roleIds);
      const foundIds = new Set(roles.map((role) => role.id));
      if (input.roleIds.some((roleId) => !foundIds.has(roleId))) {
        throw new RbacServiceError('RBAC_ASSIGNMENT_ROLE_INVALID');
      }
      const assignedAt = now();
      const result = await dependencies.repository.setAdminRoleAssignment({
        adminId: input.adminId,
        roleIds: input.roleIds,
        actorId: principal.userId,
        expectedVersion: input.version,
        assignedAt,
        reason: input.reason,
        requestId: context.requestId,
        traceId: context.traceId
      });
      if (result.kind === 'version_conflict') {
        throw new RbacServiceError('RBAC_ASSIGNMENT_VERSION_CONFLICT');
      }
      const authorization = await authorizationFor(input.adminId);
      return {
        adminId: input.adminId,
        roleIds: [...input.roleIds],
        effectivePermissions: authorization.permissions,
        version: result.version,
        assignedAt: result.assignedAt.toISOString()
      };
    }
  };
}
