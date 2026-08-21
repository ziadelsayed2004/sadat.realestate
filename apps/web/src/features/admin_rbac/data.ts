import {
  adminUserCreateSchema,
  adminUserIdParamsSchema,
  adminUserListQuerySchema,
  adminUserListSuccessEnvelopeSchema,
  adminUserPatchSchema,
  adminUserSuccessEnvelopeSchema,
  rbacRoleCreateRequestSchema,
  rbacRoleIdParamsSchema,
  rbacRoleListSuccessEnvelopeSchema,
  rbacRolePatchRequestSchema,
  rbacRoleSuccessEnvelopeSchema,
  type AdminUserCreate,
  type AdminUserData,
  type AdminUserListData,
  type AdminUserListQuery,
  type AdminUserPatch,
  type RbacRoleCreateRequest,
  type RbacRoleData,
  type RbacRoleListData,
  type RbacRolePatchRequest
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_RBAC_USERS_ROUTE = '/admin/admin-users' as const;
export const ADMIN_RBAC_ROLES_ROUTE = '/admin/roles' as const;

export interface AdminRbacAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminRbacAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type AdminRbacUsersLoader = (query: AdminUserListQuery, signal?: AbortSignal) => Promise<AdminUserListData>;
export type AdminRbacUserLoader = (adminId: string, signal?: AbortSignal) => Promise<AdminUserData>;
export type AdminRbacUserCreateMutation = (input: AdminUserCreate, signal?: AbortSignal) => Promise<AdminUserData>;
export type AdminRbacUserPatchMutation = (adminId: string, input: AdminUserPatch, signal?: AbortSignal) => Promise<AdminUserData>;
export type AdminRbacRolesLoader = (signal?: AbortSignal) => Promise<RbacRoleListData>;
export type AdminRbacRoleCreateMutation = (input: RbacRoleCreateRequest, signal?: AbortSignal) => Promise<RbacRoleData>;
export type AdminRbacRolePatchMutation = (roleId: string, input: RbacRolePatchRequest, signal?: AbortSignal) => Promise<RbacRoleData>;

export interface AdminRbacSource {
  readonly loadUsers: AdminRbacUsersLoader;
  readonly loadUser: AdminRbacUserLoader;
  readonly createUser: AdminRbacUserCreateMutation;
  readonly updateUser: AdminRbacUserPatchMutation;
  readonly loadRoles: AdminRbacRolesLoader;
  readonly createRole: AdminRbacRoleCreateMutation;
  readonly updateRole: AdminRbacRolePatchMutation;
}

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function requestOptions(options: CommonOptions): { readonly headers?: HeadersInit; readonly signal?: AbortSignal } {
  const authorization = options.authorization?.getAuthorizationHeader();
  return {
    ...(authorization === undefined ? {} : { headers: { authorization } }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
}

export async function loadAdminRbacUsers(query: Partial<AdminUserListQuery> = {}, options: CommonOptions = {}): Promise<AdminUserListData> {
  const parsedQuery = adminUserListQuerySchema.parse({ page: 1, limit: 20, ...query });
  const response = await clientFor(options).request(ADMIN_RBAC_USERS_ROUTE, {
    responseSchema: adminUserListSuccessEnvelopeSchema,
    query: parsedQuery,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminRbacUser(adminId: string, options: CommonOptions = {}): Promise<AdminUserData> {
  const id = adminUserIdParamsSchema.parse({ adminId }).adminId;
  const response = await clientFor(options).request(`${ADMIN_RBAC_USERS_ROUTE}/${id}`, {
    responseSchema: adminUserSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function createAdminRbacUser(input: unknown, options: CommonOptions = {}): Promise<AdminUserData> {
  const body = adminUserCreateSchema.parse(input);
  const response = await clientFor(options).request(ADMIN_RBAC_USERS_ROUTE, {
    method: 'POST',
    responseSchema: adminUserSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function updateAdminRbacUser(adminId: string, input: unknown, options: CommonOptions = {}): Promise<AdminUserData> {
  const id = adminUserIdParamsSchema.parse({ adminId }).adminId;
  const body = adminUserPatchSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_RBAC_USERS_ROUTE}/${id}`, {
    method: 'PATCH',
    responseSchema: adminUserSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminRbacRoles(options: CommonOptions = {}): Promise<RbacRoleListData> {
  const response = await clientFor(options).request(ADMIN_RBAC_ROLES_ROUTE, {
    responseSchema: rbacRoleListSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function createAdminRbacRole(input: unknown, options: CommonOptions = {}): Promise<RbacRoleData> {
  const body = rbacRoleCreateRequestSchema.parse(input);
  const response = await clientFor(options).request(ADMIN_RBAC_ROLES_ROUTE, {
    method: 'POST',
    responseSchema: rbacRoleSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function updateAdminRbacRole(roleId: string, input: unknown, options: CommonOptions = {}): Promise<RbacRoleData> {
  const id = rbacRoleIdParamsSchema.parse({ roleId }).roleId;
  const body = rbacRolePatchRequestSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_RBAC_ROLES_ROUTE}/${id}`, {
    method: 'PATCH',
    responseSchema: rbacRoleSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export function createAdminRbacSource(options: Omit<CommonOptions, 'signal'> = {}): AdminRbacSource {
  return {
    loadUsers: (query, signal) => loadAdminRbacUsers(query, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadUser: (adminId, signal) => loadAdminRbacUser(adminId, { ...options, ...(signal === undefined ? {} : { signal }) }),
    createUser: (input, signal) => createAdminRbacUser(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateUser: (adminId, input, signal) => updateAdminRbacUser(adminId, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadRoles: signal => loadAdminRbacRoles({ ...options, ...(signal === undefined ? {} : { signal }) }),
    createRole: (input, signal) => createAdminRbacRole(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateRole: (roleId, input, signal) => updateAdminRbacRole(roleId, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}
