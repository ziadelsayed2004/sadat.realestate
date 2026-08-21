import { randomBytes } from 'node:crypto';
import type { Connection } from 'mongoose';
import {
  communityAdminReportListDataSchema,
  communityAdminReportListQuerySchema,
  communityAdminReportSchema,
  communityReportCreateSchema,
  communityReportResolveSchema,
  type CommunityAdminReport,
  type CommunityAdminReportListData,
  type CommunityAdminReportListQuery,
  type CommunityReportCreate,
  type CommunityReportData,
  type CommunityReportResolve
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';

export interface CommunityReportContext {
  requestId: string;
  traceId: string;
}

export interface CommunityReportAuthorization {
  authorize(adminId: string, permission: 'admin:community.moderate'): Promise<boolean>;
}

export interface CommunityReportService {
  create(claims: AccessTokenClaims, input: unknown, context?: CommunityReportContext): Promise<CommunityReportData>;
  adminList(claims: AccessTokenClaims, input: unknown): Promise<CommunityAdminReportListData>;
  resolve(claims: AccessTokenClaims, reportId: string, input: unknown, context?: CommunityReportContext): Promise<CommunityAdminReport>;
}

const id = () => randomBytes(12).toString('hex');
const now = () => new Date().toISOString();

function assertReporter(claims: AccessTokenClaims): void {
  if (claims.status !== 'verified' || !['seeker', 'provider', 'admin'].includes(claims.role)) throw new Error('FORBIDDEN');
}

function actorType(claims: AccessTokenClaims): 'seeker' | 'provider' | 'admin' {
  if (claims.role === 'provider') return 'provider';
  if (claims.role === 'admin') return 'admin';
  return 'seeker';
}

function adminReportData(report: CommunityAdminReport): CommunityAdminReport {
  return communityAdminReportSchema.parse(report);
}

async function requireModeration(
  claims: AccessTokenClaims,
  authorization: CommunityReportAuthorization | undefined
): Promise<void> {
  if (claims.status !== 'verified' || claims.role !== 'admin' || authorization === undefined || !(await authorization.authorize(claims.sub, 'admin:community.moderate'))) {
    throw new Error('FORBIDDEN');
  }
}

async function recordAudit(
  audit: AuditWriter | undefined,
  claims: AccessTokenClaims,
  context: CommunityReportContext | undefined,
  reportId: string,
  action: string,
  reason: string,
  before: unknown,
  after: unknown
): Promise<void> {
  if (audit === undefined || context === undefined) return;
  await audit.record({
    actorType: actorType(claims),
    actorId: claims.sub,
    targetType: 'community_report',
    targetId: reportId,
    action,
    reason,
    before,
    after,
    requestId: context.requestId,
    traceId: context.traceId,
    occurredAt: new Date()
  });
}

export function createMemoryCommunityReportService(
  authorization?: CommunityReportAuthorization,
  audit?: AuditWriter
): CommunityReportService {
  const rows = new Map<string, CommunityAdminReport>();
  return {
    async create(claims, input, context) {
      assertReporter(claims);
      const parsed: CommunityReportCreate = communityReportCreateSchema.parse(input);
      const stamp = now();
      const report = adminReportData({
        id: id(),
        ...parsed,
        reporterId: claims.sub,
        status: 'open',
        version: 0,
        createdAt: stamp,
        updatedAt: stamp
      });
      rows.set(report.id, report);
      await recordAudit(audit, claims, context, report.id, 'community_report.create', 'Community report submitted', {}, { status: report.status, version: report.version });
      return { id: report.id, status: 'open', createdAt: report.createdAt };
    },
    async adminList(claims, input) {
      await requireModeration(claims, authorization);
      const query: CommunityAdminReportListQuery = communityAdminReportListQuerySchema.parse(input);
      const reports = [...rows.values()]
        .filter(report => query.status === undefined || report.status === query.status)
        .filter(report => query.postId === undefined || report.postId === query.postId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id));
      const start = (query.page - 1) * query.limit;
      return communityAdminReportListDataSchema.parse({
        items: reports.slice(start, start + query.limit).map(adminReportData),
        page: query.page,
        limit: query.limit,
        total: reports.length
      });
    },
    async resolve(claims, reportId, input, context) {
      await requireModeration(claims, authorization);
      const parsed: CommunityReportResolve = communityReportResolveSchema.parse(input);
      const report = rows.get(reportId);
      if (!report) throw new Error('NOT_FOUND');
      if (report.version !== parsed.version) throw new Error('VERSION_CONFLICT');
      if (!['open', 'in_review'].includes(report.status)) throw new Error('INVALID_STATE');
      const updated = adminReportData({
        ...report,
        status: parsed.action === 'resolve' ? 'resolved' : 'dismissed',
        resolutionReason: parsed.reason,
        version: report.version + 1,
        updatedAt: now()
      });
      rows.set(report.id, updated);
      await recordAudit(audit, claims, context, report.id, `community_report.${parsed.action}`, parsed.reason, { status: report.status, version: report.version }, { status: updated.status, version: updated.version });
      return updated;
    }
  };
}

export function createMongooseCommunityReportService(
  connection: Connection,
  authorization?: CommunityReportAuthorization,
  audit?: AuditWriter
): CommunityReportService {
  const reports = connection.collection('community_reports');
  let indexesReady: Promise<unknown> | undefined;
  const projection = {
    _id: 0,
    id: 1,
    postId: 1,
    reporterId: 1,
    reason: 1,
    details: 1,
    status: 1,
    resolutionReason: 1,
    version: 1,
    createdAt: 1,
    updatedAt: 1
  } as const;

  function ensureIndexes(): Promise<unknown> {
    indexesReady ??= Promise.all([
      reports.createIndex({ postId: 1, reporterId: 1, reason: 1 }, { unique: true, name: 'community_reports_reporter_reason_unique' }),
      reports.createIndex({ status: 1, createdAt: -1, id: 1 }, { name: 'community_reports_status_created' }),
      reports.createIndex({ postId: 1, status: 1, createdAt: -1 }, { name: 'community_reports_post_status' })
    ]);
    return indexesReady;
  }

  function parseRow(value: unknown): CommunityAdminReport | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const row = value as Record<string, unknown>;
    const createdAt = typeof row.createdAt === 'string' ? row.createdAt : undefined;
    if (createdAt === undefined) return undefined;
    const parsed = communityAdminReportSchema.safeParse({
      ...row,
      status: row.status ?? 'open',
      version: typeof row.version === 'number' ? row.version : 0,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : createdAt
    });
    return parsed.success ? parsed.data : undefined;
  }

  return {
    async create(claims, input, context) {
      assertReporter(claims);
      const parsed: CommunityReportCreate = communityReportCreateSchema.parse(input);
      await ensureIndexes();
      const stamp = now();
      const report = adminReportData({
        id: id(),
        ...parsed,
        reporterId: claims.sub,
        status: 'open',
        version: 0,
        createdAt: stamp,
        updatedAt: stamp
      });
      try {
        await reports.insertOne(report);
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new Error('DUPLICATE', { cause: error });
        throw error;
      }
      await recordAudit(audit, claims, context, report.id, 'community_report.create', 'Community report submitted', {}, { status: report.status, version: report.version });
      return { id: report.id, status: 'open', createdAt: report.createdAt };
    },
    async adminList(claims, input) {
      await requireModeration(claims, authorization);
      const query: CommunityAdminReportListQuery = communityAdminReportListQuerySchema.parse(input);
      const filter: Record<string, unknown> = {};
      if (query.status !== undefined) filter.status = query.status;
      if (query.postId !== undefined) filter.postId = query.postId;
      await ensureIndexes();
      const [rows, total] = await Promise.all([
        reports.find(filter, { projection }).sort({ createdAt: -1, id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
        reports.countDocuments(filter)
      ]);
      return communityAdminReportListDataSchema.parse({
        items: rows.flatMap(row => {
          const parsed = parseRow(row);
          return parsed === undefined ? [] : [parsed];
        }),
        page: query.page,
        limit: query.limit,
        total
      });
    },
    async resolve(claims, reportId, input, context) {
      await requireModeration(claims, authorization);
      const parsed: CommunityReportResolve = communityReportResolveSchema.parse(input);
      const targetStatus = parsed.action === 'resolve' ? 'resolved' : 'dismissed';
      const before = await reports.findOne({ id: reportId }, { projection: { status: 1, version: 1 } });
      if (before === null) throw new Error('NOT_FOUND');
      if (before.version !== parsed.version) throw new Error('VERSION_CONFLICT');
      if (!['open', 'in_review'].includes(before.status)) throw new Error('INVALID_STATE');
      const updated = await reports.findOneAndUpdate(
        { id: reportId, version: parsed.version, status: { $in: ['open', 'in_review'] } },
        { $set: { status: targetStatus, resolutionReason: parsed.reason, updatedAt: now() }, $inc: { version: 1 } },
        { returnDocument: 'after', projection }
      );
      const result = parseRow(updated);
      if (result === undefined) {
        const current = await reports.findOne({ id: reportId }, { projection: { version: 1, status: 1 } });
        if (current === null) throw new Error('NOT_FOUND');
        if (current.version !== parsed.version) throw new Error('VERSION_CONFLICT');
        throw new Error('INVALID_STATE');
      }
      await recordAudit(audit, claims, context, reportId, `community_report.${parsed.action}`, parsed.reason, { status: before.status, version: parsed.version }, { status: result.status, version: result.version });
      return result;
    }
  };
}
