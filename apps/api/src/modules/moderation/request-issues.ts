import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import {
  requestIssueCreateSchema,
  requestIssueListDataSchema,
  requestIssueResolveSchema,
  requestIssueSchema,
  requestListQuerySchema,
  type RequestIssue,
  type RequestIssueListData
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { ModerationModels } from './models.js';

export type RequestIssueRecord = RequestIssue;
export type RequestIssueResolveResult =
  | { kind: 'written'; issue: RequestIssueRecord }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'invalid_state' };

export interface RequestIssueRepository {
  create(issue: RequestIssueRecord): Promise<RequestIssueRecord>;
  list(page: number, limit: number): Promise<{ items: RequestIssueRecord[]; total: number }>;
  resolve(
    id: string,
    expectedVersion: number,
    status: 'resolved' | 'dismissed',
    reason: string,
    now: Date
  ): Promise<RequestIssueResolveResult>;
}

export interface RequestIssueAuthorization {
  authorize(
    adminId: string,
    permission: 'admin:request-issues.view' | 'admin:request-issues.manage'
  ): Promise<boolean>;
}

export class RequestIssueServiceError extends Error {
  constructor(readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'VERSION_CONFLICT' | 'INVALID_STATE') {
    super(code);
    this.name = 'RequestIssueServiceError';
  }
}

const id = () => randomBytes(12).toString('hex');
const canReport = (claims: AccessTokenClaims) =>
  claims.status === 'verified' && ['seeker', 'provider', 'admin'].includes(claims.role);

export interface RequestIssueService {
  create(claims: AccessTokenClaims, input: unknown): Promise<RequestIssue>;
  list(claims: AccessTokenClaims, page?: number, limit?: number): Promise<RequestIssueListData>;
  resolve(claims: AccessTokenClaims, issueId: string, input: unknown): Promise<RequestIssue>;
}

export function createRequestIssueService(dependencies: {
  repository: RequestIssueRepository;
  authorization?: RequestIssueAuthorization;
  now?: () => Date;
}): RequestIssueService {
  const now = dependencies.now ?? (() => new Date());

  async function requirePermission(
    claims: AccessTokenClaims,
    permission: 'admin:request-issues.view' | 'admin:request-issues.manage'
  ): Promise<void> {
    if (
      claims.role !== 'admin' ||
      claims.status !== 'verified' ||
      (dependencies.authorization !== undefined &&
        !await dependencies.authorization.authorize(claims.sub, permission))
    ) {
      throw new RequestIssueServiceError('FORBIDDEN');
    }
  }

  return {
    async create(claims: AccessTokenClaims, input: unknown): Promise<RequestIssue> {
      if (!canReport(claims)) throw new RequestIssueServiceError('FORBIDDEN');
      const parsed = requestIssueCreateSchema.parse(input);
      const stamp = now().toISOString();
      return requestIssueSchema.parse(await dependencies.repository.create({
        id: id(),
        requestId: parsed.requestId,
        category: parsed.category,
        details: parsed.details,
        status: 'open',
        version: 0,
        createdAt: stamp,
        updatedAt: stamp
      }));
    },

    async list(
      claims: AccessTokenClaims,
      page = 1,
      limit = 20
    ): Promise<RequestIssueListData> {
      await requirePermission(claims, 'admin:request-issues.view');
      const parsedPage = requestListQuerySchema.parse({ page, limit });
      const result = await dependencies.repository.list(parsedPage.page, parsedPage.limit);
      return requestIssueListDataSchema.parse({
        items: result.items,
        page: parsedPage.page,
        limit: parsedPage.limit,
        total: result.total
      });
    },

    async resolve(claims: AccessTokenClaims, issueId: string, input: unknown): Promise<RequestIssue> {
      await requirePermission(claims, 'admin:request-issues.manage');
      const parsed = requestIssueResolveSchema.parse(input);
      const result = await dependencies.repository.resolve(
        issueId,
        parsed.expectedVersion,
        parsed.action === 'resolve' ? 'resolved' : 'dismissed',
        parsed.reason,
        now()
      );
      if (result.kind === 'not_found') throw new RequestIssueServiceError('NOT_FOUND');
      if (result.kind === 'version_conflict') throw new RequestIssueServiceError('VERSION_CONFLICT');
      if (result.kind === 'invalid_state') throw new RequestIssueServiceError('INVALID_STATE');
      return requestIssueSchema.parse(result.issue);
    }
  };
}

export function createInMemoryRequestIssueRepository(seed: RequestIssueRecord[] = []): RequestIssueRepository {
  const rows = new Map(seed.map(item => [item.id, item]));
  return {
    async create(issue) {
      rows.set(issue.id, issue);
      return issue;
    },
    async list(page, limit) {
      const all = [...rows.values()];
      return { items: all.slice((page - 1) * limit, page * limit), total: all.length };
    },
    async resolve(issueId, expectedVersion, status, reason, now) {
      const row = rows.get(issueId);
      if (!row) return { kind: 'not_found' };
      if (row.version !== expectedVersion) return { kind: 'version_conflict' };
      if (row.status !== 'open') return { kind: 'invalid_state' };
      const updated = {
        ...row,
        status,
        resolutionReason: reason,
        version: row.version + 1,
        updatedAt: now.toISOString()
      };
      rows.set(issueId, updated);
      return { kind: 'written', issue: updated };
    }
  };
}

type MongooseRequestIssue = {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  category: RequestIssue['category'];
  details: string;
  status: RequestIssue['status'];
  resolutionReason?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

function fromMongoose(row: MongooseRequestIssue): RequestIssueRecord {
  return {
    id: row._id.toHexString(),
    requestId: row.requestId.toHexString(),
    category: row.category,
    details: row.details,
    status: row.status,
    ...(row.resolutionReason ? { resolutionReason: row.resolutionReason } : {}),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function createMongooseRequestIssueRepository(
  models: Pick<ModerationModels, 'RequestIssue'>
): RequestIssueRepository {
  return {
    async create(issue) {
      const created = await new models.RequestIssue({
        _id: new Types.ObjectId(issue.id),
        requestId: new Types.ObjectId(issue.requestId),
        category: issue.category,
        details: issue.details,
        status: issue.status,
        version: issue.version,
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt)
      }).save();
      return fromMongoose(created.toObject() as MongooseRequestIssue);
    },
    async list(page, limit) {
      const [rows, total] = await Promise.all([
        models.RequestIssue.find({}).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        models.RequestIssue.countDocuments({})
      ]);
      return { items: rows.map(row => fromMongoose(row as MongooseRequestIssue)), total };
    },
    async resolve(issueId, expectedVersion, status, reason, now) {
      const updated = await models.RequestIssue.findOneAndUpdate(
        { _id: issueId, version: expectedVersion, status: 'open' },
        { $set: { status, resolutionReason: reason, updatedAt: now }, $inc: { version: 1 } },
        { new: true, runValidators: true, lean: true }
      );
      if (updated) return { kind: 'written', issue: fromMongoose(updated as MongooseRequestIssue) };
      const current = await models.RequestIssue.findById(issueId).lean();
      if (!current) return { kind: 'not_found' };
      if ((current as MongooseRequestIssue).version !== expectedVersion) return { kind: 'version_conflict' };
      return { kind: 'invalid_state' };
    }
  };
}
