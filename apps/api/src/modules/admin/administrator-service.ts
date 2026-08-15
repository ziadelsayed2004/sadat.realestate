import type {
  AdminUserCreate,
  AdminUserData,
  AdminUserListData,
  AdminUserListQuery,
  AdminUserPatch
} from '@sadat-real-estate/contracts';
import {
  adminUserCreateSchema,
  adminUserDataSchema,
  adminUserListQuerySchema,
  adminUserPatchSchema
} from '@sadat-real-estate/contracts';

export interface AdministratorAuthorization {
  authorize(adminId: string, permission: 'admin:staff.view' | 'admin:staff.manage'): Promise<boolean>;
}

export type AdministratorWriteResult =
  | { kind: 'created'; administrator: AdminUserData }
  | { kind: 'updated'; administrator: AdminUserData }
  | { kind: 'email_conflict' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface AdministratorRepository {
  list(): Promise<readonly AdminUserData[]>;
  findById(id: string): Promise<AdminUserData | undefined>;
  countActiveSuperAdmins(): Promise<number>;
  create(input: { actorId: string; data: AdminUserCreate; now: string }): Promise<AdministratorWriteResult>;
  update(input: { actorId: string; id: string; expectedVersion: number; patch: AdminUserPatch; now: string }): Promise<AdministratorWriteResult>;
}

export interface AdministratorServiceDependencies {
  authorization: AdministratorAuthorization;
  repository: AdministratorRepository;
  now?: () => Date;
}

export type AdministratorServiceErrorCode =
  | 'ADMINISTRATOR_FORBIDDEN'
  | 'ADMINISTRATOR_NOT_FOUND'
  | 'ADMINISTRATOR_EMAIL_CONFLICT'
  | 'ADMINISTRATOR_VERSION_CONFLICT'
  | 'ADMINISTRATOR_SELF_LOCKOUT'
  | 'ADMINISTRATOR_LAST_SUPER_ADMIN';

export class AdministratorServiceError extends Error {
  constructor(readonly code: AdministratorServiceErrorCode) {
    super(code);
    this.name = 'AdministratorServiceError';
  }
}

function objectId(value: string): boolean {
  return /^[a-f0-9]{24}$/.test(value);
}

async function requirePermission(
  dependencies: AdministratorServiceDependencies,
  adminId: string,
  permission: 'admin:staff.view' | 'admin:staff.manage'
): Promise<void> {
  if (!objectId(adminId) || !await dependencies.authorization.authorize(adminId, permission)) {
    throw new AdministratorServiceError('ADMINISTRATOR_FORBIDDEN');
  }
}

function actions(value: AdminUserData, actorId?: string): AdminUserData['availableActions'] {
  if (value.id === actorId) return ['update'];
  return value.status === 'active' ? ['update', 'disable'] : ['update', 'enable'];
}

function output(value: AdminUserData, actorId?: string): AdminUserData {
  return adminUserDataSchema.parse({ ...value, availableActions: actions(value, actorId) });
}

export function createAdministratorService(dependencies: AdministratorServiceDependencies) {
  const clock = dependencies.now ?? (() => new Date());
  const list = async (adminId: string, input: unknown): Promise<AdminUserListData> => {
    await requirePermission(dependencies, adminId, 'admin:staff.view');
    const query = adminUserListQuerySchema.parse(input) as AdminUserListQuery;
    const values = (await dependencies.repository.list())
      .map((value) => output(value, adminId))
      .filter((value) => (!query.status || value.status === query.status) && (!query.accessLevel || value.accessLevel === query.accessLevel))
      .sort((left, right) => left.email.localeCompare(right.email) || left.id.localeCompare(right.id));
    return { items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length };
  };
  const get = async (adminId: string, id: string): Promise<AdminUserData> => {
    await requirePermission(dependencies, adminId, 'admin:staff.view');
    if (!objectId(id)) throw new AdministratorServiceError('ADMINISTRATOR_NOT_FOUND');
    const value = await dependencies.repository.findById(id);
    if (!value) throw new AdministratorServiceError('ADMINISTRATOR_NOT_FOUND');
    return output(value, adminId);
  };
  const create = async (adminId: string, input: unknown): Promise<AdminUserData> => {
    await requirePermission(dependencies, adminId, 'admin:staff.manage');
    const data = adminUserCreateSchema.parse(input);
    const result = await dependencies.repository.create({ actorId: adminId, data, now: clock().toISOString() });
    if (result.kind === 'email_conflict') throw new AdministratorServiceError('ADMINISTRATOR_EMAIL_CONFLICT');
    if (result.kind !== 'created') throw new AdministratorServiceError('ADMINISTRATOR_NOT_FOUND');
    return output(result.administrator, adminId);
  };
  const update = async (adminId: string, id: string, input: unknown): Promise<AdminUserData> => {
    await requirePermission(dependencies, adminId, 'admin:staff.manage');
    if (!objectId(id)) throw new AdministratorServiceError('ADMINISTRATOR_NOT_FOUND');
    const patch = adminUserPatchSchema.parse(input) as AdminUserPatch;
    const current = await dependencies.repository.findById(id);
    if (!current) throw new AdministratorServiceError('ADMINISTRATOR_NOT_FOUND');
    const nextStatus = patch.status ?? current.status;
    const nextAccessLevel = patch.accessLevel ?? current.accessLevel;
    if (id === adminId && (nextStatus === 'disabled' || nextAccessLevel !== current.accessLevel)) {
      throw new AdministratorServiceError('ADMINISTRATOR_SELF_LOCKOUT');
    }
    if (current.accessLevel === 'super_admin' && current.status === 'active' && (nextStatus !== 'active' || nextAccessLevel !== 'super_admin') && await dependencies.repository.countActiveSuperAdmins() <= 1) {
      throw new AdministratorServiceError('ADMINISTRATOR_LAST_SUPER_ADMIN');
    }
    const result = await dependencies.repository.update({ actorId: adminId, id, expectedVersion: patch.expectedVersion, patch, now: clock().toISOString() });
    if (result.kind === 'email_conflict') throw new AdministratorServiceError('ADMINISTRATOR_EMAIL_CONFLICT');
    if (result.kind === 'version_conflict') throw new AdministratorServiceError('ADMINISTRATOR_VERSION_CONFLICT');
    if (result.kind !== 'updated') throw new AdministratorServiceError('ADMINISTRATOR_NOT_FOUND');
    return output(result.administrator, adminId);
  };
  return {
    list,
    listAdministrators: list,
    get,
    getAdministrator: get,
    create,
    createAdministrator: create,
    update,
    updateAdministrator: update,
    disable: (adminId: string, id: string, input: unknown) => update(adminId, id, input)
  };
}

export const createAdminUserService = createAdministratorService;
