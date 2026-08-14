import {
  locationCreateRequestSchema,
  locationDeleteRequestSchema,
  locationListQuerySchema,
  locationObjectIdSchema,
  locationPatchRequestSchema,
  type LocationCreateRequest,
  type LocationData,
  type LocationDeleteData,
  type LocationDeleteRequest,
  type LocationListData,
  type LocationListQuery,
  type LocationPatchRequest,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import type { LocationMutationMetadata, LocationRepository, StoredLocation } from './repository.js';

export type LocationServiceErrorCode =
  | 'LOCATION_FORBIDDEN'
  | 'LOCATION_NOT_FOUND'
  | 'LOCATION_PARENT_NOT_FOUND'
  | 'LOCATION_PARENT_INVALID'
  | 'LOCATION_SLUG_EXISTS'
  | 'LOCATION_VERSION_CONFLICT'
  | 'LOCATION_IN_USE';

export class LocationServiceError extends Error {
  readonly code: LocationServiceErrorCode;
  constructor(code: LocationServiceErrorCode) {
    super(code);
    this.name = 'LocationServiceError';
    this.code = code;
  }
}

export interface LocationPrincipal { userId: string }
export interface LocationMutationContext { requestId: string; traceId: string }
export interface LocationAuthorization {
  authorize(adminId: string, permission: RbacPermission): Promise<boolean>;
}

export interface LocationService {
  list(principal: LocationPrincipal, query: LocationListQuery): Promise<{
    data: LocationListData; page: number; limit: number; total: number;
  }>;
  create(principal: LocationPrincipal, input: LocationCreateRequest, context: LocationMutationContext): Promise<LocationData>;
  update(principal: LocationPrincipal, id: string, input: LocationPatchRequest, context: LocationMutationContext): Promise<LocationData>;
  delete(principal: LocationPrincipal, id: string, input: LocationDeleteRequest, context: LocationMutationContext): Promise<LocationDeleteData>;
}

function data(record: StoredLocation, canManage: boolean): LocationData {
  return {
    id: record.id,
    kind: record.kind,
    name: record.name,
    slug: record.slug,
    ...(record.parentLocationId ? { parentLocationId: record.parentLocationId } : {}),
    ...(record.coordinates ? { coordinates: record.coordinates } : {}),
    order: record.order,
    active: record.active,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    availableActions: canManage ? ['update', 'delete'] : []
  };
}

function metadata(
  principal: LocationPrincipal,
  reason: string,
  context: LocationMutationContext,
  changedAt: Date
): LocationMutationMetadata {
  return { actorId: principal.userId, reason, ...context, changedAt };
}

export function createLocationService(dependencies: {
  repository: LocationRepository;
  authorization: LocationAuthorization;
  now?: () => Date;
}): LocationService {
  const now = dependencies.now ?? (() => new Date());

  async function allowed(userId: string, permission: RbacPermission): Promise<boolean> {
    return dependencies.authorization.authorize(userId, permission);
  }

  async function requirePermission(userId: string, permission: RbacPermission): Promise<void> {
    if (!await allowed(userId, permission)) throw new LocationServiceError('LOCATION_FORBIDDEN');
  }

  async function requireParent(parentId: string | undefined): Promise<void> {
    if (parentId && !await dependencies.repository.parentLocationExists(parentId)) {
      throw new LocationServiceError('LOCATION_PARENT_NOT_FOUND');
    }
  }

  function writeResult(result: Awaited<ReturnType<LocationRepository['create']>>): StoredLocation {
    if (result.kind === 'slug_conflict') throw new LocationServiceError('LOCATION_SLUG_EXISTS');
    if (result.kind === 'not_found') throw new LocationServiceError('LOCATION_NOT_FOUND');
    if (result.kind === 'version_conflict') throw new LocationServiceError('LOCATION_VERSION_CONFLICT');
    return result.location;
  }

  return {
    async list(principal, unparsedQuery) {
      const query = locationListQuerySchema.parse(unparsedQuery);
      await requirePermission(principal.userId, 'admin:locations.view');
      const canManage = await allowed(principal.userId, 'admin:locations.manage');
      const result = await dependencies.repository.list(query);
      return { data: { items: result.items.map((item) => data(item, canManage)) }, page: query.page, limit: query.limit, total: result.total };
    },
    async create(principal, unparsedInput, context) {
      const input = locationCreateRequestSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:locations.manage');
      await requireParent(input.parentLocationId);
      const result = await dependencies.repository.create({
        location: {
          kind: input.kind, name: input.name, slug: input.slug,
          ...(input.parentLocationId ? { parentLocationId: input.parentLocationId } : {}),
          ...(input.coordinates ? { coordinates: input.coordinates } : {}),
          order: input.order, active: input.active
        },
        metadata: metadata(principal, input.reason, context, now())
      });
      return data(writeResult(result), true);
    },
    async update(principal, id, unparsedInput, context) {
      locationObjectIdSchema.parse(id);
      const input = locationPatchRequestSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:locations.manage');
      const current = await dependencies.repository.findById(id);
      if (!current) throw new LocationServiceError('LOCATION_NOT_FOUND');
      if (input.parentLocationId) {
        if (current.kind !== 'neighborhood' || input.parentLocationId === id) {
          throw new LocationServiceError('LOCATION_PARENT_INVALID');
        }
        await requireParent(input.parentLocationId);
      }
      const changes = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.parentLocationId !== undefined ? { parentLocationId: input.parentLocationId } : {}),
        ...(input.coordinates !== undefined ? { coordinates: input.coordinates } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(input.active !== undefined ? { active: input.active } : {})
      };
      const result = await dependencies.repository.update({
        id, expectedVersion: input.version, changes, before: current,
        metadata: metadata(principal, input.reason, context, now())
      });
      return data(writeResult(result), true);
    },
    async delete(principal, id, unparsedInput, context) {
      locationObjectIdSchema.parse(id);
      const input = locationDeleteRequestSchema.parse(unparsedInput);
      await requirePermission(principal.userId, 'admin:locations.manage');
      const current = await dependencies.repository.findById(id);
      if (!current) throw new LocationServiceError('LOCATION_NOT_FOUND');
      const result = await dependencies.repository.delete({
        id, expectedVersion: input.version, before: current,
        metadata: metadata(principal, input.reason, context, now())
      });
      if (result.kind === 'not_found') throw new LocationServiceError('LOCATION_NOT_FOUND');
      if (result.kind === 'version_conflict') throw new LocationServiceError('LOCATION_VERSION_CONFLICT');
      if (result.kind === 'in_use') throw new LocationServiceError('LOCATION_IN_USE');
      return { id, deleted: true };
    }
  };
}
