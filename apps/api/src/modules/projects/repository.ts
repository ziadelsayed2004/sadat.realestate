import { Types, type ClientSession, type Connection } from 'mongoose';
import type { ProjectListQuery, ProjectStatus } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { ProjectModels, ProjectRecord } from './models.js';

export interface StoredProject {
  id: string;
  providerId: string;
  name: ProjectRecord['name'];
  slug: string;
  description?: ProjectRecord['description'];
  locationId?: string;
  organizationId?: string;
  website?: string;
  status: ProjectStatus;
  submittedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewReason?: string;
  publishedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMutationMetadata {
  actorId: string;
  reason: string;
  requestId: string;
  traceId: string;
  changedAt: Date;
}

export type ProjectWriteResult =
  | { kind: 'written'; project: StoredProject }
  | { kind: 'slug_conflict' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'invalid_state' };

export type ProjectChanges = {
  name?: StoredProject['name'];
  slug?: string;
  description?: StoredProject['description'] | null;
  locationId?: string | null;
  organizationId?: string | null;
  website?: string | null;
};

export interface ProjectRepository {
  list(providerId: string, q: ProjectListQuery): Promise<{ items: StoredProject[]; total: number }>;
  listAll(q: ProjectListQuery): Promise<{ items: StoredProject[]; total: number }>;
  findById(providerId: string, id: string): Promise<StoredProject | null>;
  findByIdAny(id: string): Promise<StoredProject | null>;
  create(input: { project: Omit<StoredProject, 'id' | 'version' | 'createdAt' | 'updatedAt'>; metadata: ProjectMutationMetadata }): Promise<ProjectWriteResult>;
  update(input: { providerId: string; id: string; expectedVersion: number; changes: ProjectChanges; metadata: ProjectMutationMetadata; before: StoredProject }): Promise<ProjectWriteResult>;
  submit(input: { providerId: string; id: string; expectedVersion: number; metadata: ProjectMutationMetadata; before: StoredProject }): Promise<ProjectWriteResult>;
  review(input: { id: string; expectedVersion: number; toStatus: Extract<ProjectStatus, 'needs_changes' | 'approved' | 'rejected' | 'published'>; reviewerId: string; metadata: ProjectMutationMetadata; before: StoredProject }): Promise<ProjectWriteResult>;
}

function stored(r: ProjectRecord & { _id: Types.ObjectId }): StoredProject {
  return {
    id: r._id.toHexString(),
    providerId: r.providerId.toHexString(),
    name: structuredClone(r.name),
    slug: r.slug,
    ...(r.description ? { description: structuredClone(r.description) } : {}),
    ...(r.locationId ? { locationId: r.locationId.toHexString() } : {}),
    ...(r.organizationId ? { organizationId: r.organizationId.toHexString() } : {}),
    ...(r.website ? { website: r.website } : {}),
    status: r.status,
    ...(r.submittedAt ? { submittedAt: r.submittedAt } : {}),
    ...(r.reviewedBy ? { reviewedBy: r.reviewedBy.toHexString() } : {}),
    ...(r.reviewedAt ? { reviewedAt: r.reviewedAt } : {}),
    ...(r.reviewReason ? { reviewReason: r.reviewReason } : {}),
    ...(r.publishedAt ? { publishedAt: r.publishedAt } : {}),
    version: r.version,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

const duplicate = (e: unknown) => typeof e === 'object' && e !== null && 'code' in e && (e as { code?: unknown }).code === 11000;

export function createMongooseProjectRepository(connection: Connection, models: ProjectModels, audit: AuditWriter): ProjectRepository {
  async function tx<T>(run: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await connection.startSession();
    try { return await session.withTransaction(() => run(session)); } finally { await session.endSession(); }
  }

  async function auditWrite(action: string, id: string, before: unknown, after: unknown, metadata: ProjectMutationMetadata, session: ClientSession, actorType: 'admin' | 'provider' = 'provider'): Promise<void> {
    await audit.record({ actorType, actorId: metadata.actorId, targetType: 'project', targetId: id, action, reason: metadata.reason, before, after, requestId: metadata.requestId, traceId: metadata.traceId, occurredAt: metadata.changedAt }, session);
  }

  async function listProjects(filter: Record<string, unknown>, query: ProjectListQuery): Promise<{ items: StoredProject[]; total: number }> {
    if (query.status) filter.status = query.status;
    if (query.search) filter.$text = { $search: query.search };
    const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = query.sort === 'name' ? { 'name.en': direction, slug: 1 } : { [query.sort]: direction, slug: 1 };
    const [rows, total] = await Promise.all([
      models.Project.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      models.Project.countDocuments(filter)
    ]);
    return { items: rows.map(row => stored(row as ProjectRecord & { _id: Types.ObjectId })), total };
  }

  async function transitionState(input: { id: string; expectedVersion: number; filter: Record<string, unknown>; set: Record<string, unknown>; metadata: ProjectMutationMetadata; before: StoredProject; auditAction: string; actorType: 'admin' | 'provider' }): Promise<ProjectWriteResult> {
    try {
      return await tx(async session => {
        const result = await models.Project.findOneAndUpdate(
          { _id: input.id, version: input.expectedVersion, ...input.filter },
          { $set: input.set, $inc: { version: 1 } },
          { new: true, runValidators: true, lean: true, session }
        );
        if (!result) {
          const current = await models.Project.findById(input.id).lean().session(session);
          if (!current) return { kind: 'not_found' };
          if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
          return { kind: 'invalid_state' };
        }
        const output = stored(result as ProjectRecord & { _id: Types.ObjectId });
        await auditWrite(input.auditAction, output.id, input.before, output, input.metadata, session, input.actorType);
        return { kind: 'written', project: output };
      });
    } catch (error) {
      if (duplicate(error)) return { kind: 'slug_conflict' };
      throw error;
    }
  }

  return {
    async list(providerId, query) {
      return listProjects({ providerId: new Types.ObjectId(providerId) }, query);
    },
    async listAll(query) {
      return listProjects({}, query);
    },
    async findById(providerId, id) {
      const result = await models.Project.findOne({ _id: id, providerId }).lean();
      return result ? stored(result as ProjectRecord & { _id: Types.ObjectId }) : null;
    },
    async findByIdAny(id) {
      const result = await models.Project.findById(id).lean();
      return result ? stored(result as ProjectRecord & { _id: Types.ObjectId }) : null;
    },
    async create(input) {
      try {
        return await tx(async session => {
          const project = {
            ...input.project,
            providerId: new Types.ObjectId(input.project.providerId),
            ...(input.project.locationId ? { locationId: new Types.ObjectId(input.project.locationId) } : {}),
            ...(input.project.organizationId ? { organizationId: new Types.ObjectId(input.project.organizationId) } : {}),
            createdAt: input.metadata.changedAt,
            updatedAt: input.metadata.changedAt
          };
          const document = new models.Project(project);
          await document.save({ session });
          const output = stored(document.toObject() as ProjectRecord & { _id: Types.ObjectId });
          await auditWrite('project.create', output.id, null, output, input.metadata, session);
          return { kind: 'written', project: output };
        });
      } catch (error) {
        if (duplicate(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },
    async update(input) {
      try {
        return await tx(async session => {
          const set: Record<string, unknown> = { updatedAt: input.metadata.changedAt };
          for (const key of ['name', 'slug', 'description', 'website'] as const) if (input.changes[key] !== undefined) set[key] = input.changes[key];
          if (input.changes.locationId !== undefined) set.locationId = input.changes.locationId === null ? null : new Types.ObjectId(input.changes.locationId);
          if (input.changes.organizationId !== undefined) set.organizationId = input.changes.organizationId === null ? null : new Types.ObjectId(input.changes.organizationId);
          const result = await models.Project.findOneAndUpdate({ _id: input.id, providerId: input.providerId, version: input.expectedVersion }, { $set: set, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
          if (!result) return await models.Project.exists({ _id: input.id, providerId: input.providerId }).session(session) ? { kind: 'version_conflict' } : { kind: 'not_found' };
          const output = stored(result as ProjectRecord & { _id: Types.ObjectId });
          await auditWrite('project.update', output.id, input.before, output, input.metadata, session);
          return { kind: 'written', project: output };
        });
      } catch (error) {
        if (duplicate(error)) return { kind: 'slug_conflict' };
        throw error;
      }
    },
    async submit(input) {
      return transitionState({ id: input.id, expectedVersion: input.expectedVersion, filter: { providerId: input.providerId, status: { $in: ['draft', 'needs_changes'] } }, set: { status: 'pending_review', submittedAt: input.metadata.changedAt, reviewedBy: null, reviewedAt: null, reviewReason: null, updatedAt: input.metadata.changedAt }, metadata: input.metadata, before: input.before, auditAction: 'project.submit', actorType: 'provider' });
    },
    async review(input) {
      const set: Record<string, unknown> = { status: input.toStatus, reviewedBy: new Types.ObjectId(input.reviewerId), reviewedAt: input.metadata.changedAt, reviewReason: input.metadata.reason, updatedAt: input.metadata.changedAt };
      if (input.toStatus === 'published') set.publishedAt = input.metadata.changedAt;
      return transitionState({ id: input.id, expectedVersion: input.expectedVersion, filter: { status: input.toStatus === 'published' ? 'approved' : 'pending_review' }, set, metadata: input.metadata, before: input.before, auditAction: 'project.review', actorType: 'admin' });
    }
  };
}
