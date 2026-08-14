import {
  projectCreateSchema,
  projectListQuerySchema,
  projectObjectIdSchema,
  projectPatchSchema,
  projectReviewRequestSchema,
  projectSubmitRequestSchema,
  type ProjectCreate,
  type ProjectData,
  type ProjectListData,
  type ProjectListQuery,
  type ProjectPatch,
  type ProjectReviewRequest,
  type ProjectSubmitRequest,
  projectPublicDataSchema,
  type ProjectPublicData,
  type ProjectPublicDeveloper,
  type ProjectPublicProperty
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { ProjectRepository, ProjectMutationMetadata, StoredProject, ProjectChanges, ProjectWriteResult } from './repository.js';

export type ProjectServiceErrorCode =
  | 'PROJECT_FORBIDDEN'
  | 'PROJECT_NOT_FOUND'
  | 'PROJECT_SLUG_EXISTS'
  | 'PROJECT_VERSION_CONFLICT'
  | 'PROJECT_TRANSITION_INVALID';

export class ProjectServiceError extends Error {
  readonly code: ProjectServiceErrorCode;
  constructor(code: ProjectServiceErrorCode) { super(code); this.name = 'ProjectServiceError'; this.code = code; }
}

export interface ProjectMutationContext { requestId: string; traceId: string; }
export interface ProjectAuthorization { authorize(adminId: string, permission: 'admin:projects.review'): Promise<boolean>; }

export function publicProjectProjection(project: StoredProject, developer: ProjectPublicDeveloper | null = null, linkedProperties: ProjectPublicProperty[] = []): ProjectPublicData | null {
  if (project.status !== 'published') return null;
  const properties = linkedProperties.filter(property => property.status === 'published' && property.active !== false).sort((left, right) => left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en'));
  return projectPublicDataSchema.parse({ id: project.id, slug: project.slug, name: project.name, ...(project.description ? { description: project.description } : {}), ...(project.website ? { website: project.website } : {}), developer, linkedPublishedProperties: properties });
}

function actions(project: StoredProject, actor: 'provider' | 'admin'): ProjectData['availableActions'] {
  if (actor === 'provider') return project.status === 'draft' || project.status === 'needs_changes' ? ['update', 'submit'] : [];
  if (project.status === 'pending_review') return ['needs_changes', 'approve', 'reject'];
  return project.status === 'approved' ? ['publish'] : [];
}

function data(project: StoredProject, actor: 'provider' | 'admin' = 'provider'): ProjectData {
  return {
    id: project.id,
    providerId: project.providerId,
    name: project.name,
    slug: project.slug,
    ...(project.description ? { description: project.description } : {}),
    ...(project.locationId ? { locationId: project.locationId } : {}),
    ...(project.organizationId ? { organizationId: project.organizationId } : {}),
    ...(project.website ? { website: project.website } : {}),
    status: project.status,
    ...(project.submittedAt ? { submittedAt: project.submittedAt.toISOString() } : {}),
    ...(project.reviewedBy ? { reviewedBy: project.reviewedBy } : {}),
    ...(project.reviewedAt ? { reviewedAt: project.reviewedAt.toISOString() } : {}),
    ...(project.reviewReason ? { reviewReason: project.reviewReason } : {}),
    ...(project.publishedAt ? { publishedAt: project.publishedAt.toISOString() } : {}),
    version: project.version,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    availableActions: actions(project, actor)
  };
}

function write(result: ProjectWriteResult): StoredProject {
  if (result.kind === 'slug_conflict') throw new ProjectServiceError('PROJECT_SLUG_EXISTS');
  if (result.kind === 'not_found') throw new ProjectServiceError('PROJECT_NOT_FOUND');
  if (result.kind === 'version_conflict') throw new ProjectServiceError('PROJECT_VERSION_CONFLICT');
  if (result.kind === 'invalid_state') throw new ProjectServiceError('PROJECT_TRANSITION_INVALID');
  return result.project;
}

export function createProjectService(dependencies: { repository: ProjectRepository; authorization?: ProjectAuthorization; now?: () => Date }) {
  const now = dependencies.now ?? (() => new Date());
  function provider(claims: AccessTokenClaims): void {
    if (claims.role !== 'provider' || claims.status !== 'verified') throw new ProjectServiceError('PROJECT_FORBIDDEN');
  }
  async function reviewPermission(adminId: string): Promise<void> {
    if (!dependencies.authorization || !await dependencies.authorization.authorize(adminId, 'admin:projects.review')) throw new ProjectServiceError('PROJECT_FORBIDDEN');
  }
  function metadata(actorId: string, reason: string, context: ProjectMutationContext): ProjectMutationMetadata {
    return { actorId, reason, requestId: context.requestId, traceId: context.traceId, changedAt: now() };
  }

  return {
    async list(claims: AccessTokenClaims, query: ProjectListQuery): Promise<{ data: ProjectListData; page: number; limit: number; total: number }> {
      provider(claims);
      const parsed = projectListQuerySchema.parse(query);
      const result = await dependencies.repository.list(claims.sub, parsed);
      return { data: { items: result.items.map(project => data(project)) }, page: parsed.page, limit: parsed.limit, total: result.total };
    },
    async create(claims: AccessTokenClaims, input: ProjectCreate, context: ProjectMutationContext): Promise<ProjectData> {
      provider(claims);
      const parsed = projectCreateSchema.parse(input);
      const result = await dependencies.repository.create({ project: { providerId: claims.sub, name: parsed.name, slug: parsed.slug, ...(parsed.description ? { description: parsed.description } : {}), ...(parsed.locationId ? { locationId: parsed.locationId } : {}), ...(parsed.organizationId ? { organizationId: parsed.organizationId } : {}), ...(parsed.website ? { website: parsed.website } : {}), status: 'draft' }, metadata: metadata(claims.sub, parsed.reason, context) });
      return data(write(result));
    },
    async update(claims: AccessTokenClaims, id: string, input: ProjectPatch, context: ProjectMutationContext): Promise<ProjectData> {
      provider(claims);
      projectObjectIdSchema.parse(id);
      const parsed = projectPatchSchema.parse(input);
      const before = await dependencies.repository.findById(claims.sub, id);
      if (!before) throw new ProjectServiceError('PROJECT_NOT_FOUND');
      const changes: ProjectChanges = {};
      if (parsed.name !== undefined) changes.name = parsed.name;
      if (parsed.slug !== undefined) changes.slug = parsed.slug;
      if (parsed.description !== undefined) changes.description = parsed.description;
      if (parsed.locationId !== undefined) changes.locationId = parsed.locationId;
      if (parsed.organizationId !== undefined) changes.organizationId = parsed.organizationId;
      if (parsed.website !== undefined) changes.website = parsed.website;
      return data(write(await dependencies.repository.update({ providerId: claims.sub, id, expectedVersion: parsed.version, changes, metadata: metadata(claims.sub, parsed.reason, context), before })));
    },
    async submit(claims: AccessTokenClaims, id: string, input: ProjectSubmitRequest, context: ProjectMutationContext): Promise<ProjectData> {
      provider(claims);
      projectObjectIdSchema.parse(id);
      const parsed = projectSubmitRequestSchema.parse(input);
      const before = await dependencies.repository.findById(claims.sub, id);
      if (!before) throw new ProjectServiceError('PROJECT_NOT_FOUND');
      return data(write(await dependencies.repository.submit({ providerId: claims.sub, id, expectedVersion: parsed.version, metadata: metadata(claims.sub, parsed.reason, context), before })));
    },
    async review(adminId: string, id: string, input: ProjectReviewRequest, context: ProjectMutationContext): Promise<ProjectData> {
      await reviewPermission(adminId);
      projectObjectIdSchema.parse(id);
      const parsed = projectReviewRequestSchema.parse(input);
      const before = await dependencies.repository.findByIdAny(id);
      if (!before) throw new ProjectServiceError('PROJECT_NOT_FOUND');
      const toStatus = parsed.action === 'needs_changes' ? 'needs_changes' : parsed.action === 'approve' ? 'approved' : parsed.action === 'reject' ? 'rejected' : 'published';
      return data(write(await dependencies.repository.review({ id, expectedVersion: parsed.version, toStatus, reviewerId: adminId, metadata: metadata(adminId, parsed.reason, context), before })), 'admin');
    }
  };
}
