import { Types, type ClientSession, type Connection } from 'mongoose';
import type { PropertyReportAction, PropertyReportCreate, PropertyReportListQuery, PropertyReportReason, PropertyReportStatus } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type { ModerationModels, PropertyReportRecord } from './models.js';

export interface StoredPropertyReport { id: string; propertyId: string; reporterId?: string; reason: PropertyReportReason; details?: string; status: PropertyReportStatus; resolutionReason?: string; resolvedBy?: string; resolvedAt?: Date; version: number; createdAt: Date; updatedAt: Date; }
export type ReportWriteResult = { kind: 'written'; report: StoredPropertyReport } | { kind: 'duplicate' } | { kind: 'not_found' } | { kind: 'version_conflict' } | { kind: 'invalid_state' };
export interface ModerationRepository {
  create(input: { propertyId: string; reporterId: string; report: PropertyReportCreate; actorType: 'seeker' | 'provider' | 'admin'; requestId: string; traceId: string; now: Date }): Promise<ReportWriteResult>;
  list(query: PropertyReportListQuery): Promise<{ items: StoredPropertyReport[]; total: number }>;
  resolve(input: { reportId: string; expectedVersion: number; action: PropertyReportAction; adminId: string; reason: string; requestId: string; traceId: string; now: Date }): Promise<ReportWriteResult>;
}
function stored(record: PropertyReportRecord & { _id: Types.ObjectId }): StoredPropertyReport { return { id: record._id.toHexString(), propertyId: record.propertyId.toHexString(), ...(record.reporterId ? { reporterId: record.reporterId.toHexString() } : {}), reason: record.reason, ...(record.details ? { details: record.details } : {}), status: record.status, ...(record.resolutionReason ? { resolutionReason: record.resolutionReason } : {}), ...(record.resolvedBy ? { resolvedBy: record.resolvedBy.toHexString() } : {}), ...(record.resolvedAt ? { resolvedAt: record.resolvedAt } : {}), version: record.version, createdAt: record.createdAt, updatedAt: record.updatedAt }; }
function duplicate(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000; }

export function createMongooseModerationRepository(connection: Connection, models: ModerationModels, audit: AuditWriter): ModerationRepository {
  async function transaction<T>(run: (session: ClientSession) => Promise<T>): Promise<T> { const session = await connection.startSession(); try { return await session.withTransaction(() => run(session)); } finally { await session.endSession(); } }
  return {
    async create(input) {
      try { return await transaction(async session => { const doc = new models.PropertyReport({ propertyId: new Types.ObjectId(input.propertyId), reporterId: new Types.ObjectId(input.reporterId), reason: input.report.reason, ...(input.report.details ? { details: input.report.details } : {}), status: 'open', createdAt: input.now, updatedAt: input.now }); await doc.save({ session }); const report = stored(doc.toObject() as PropertyReportRecord & { _id: Types.ObjectId }); await audit.record({ actorType: input.actorType, actorId: input.reporterId, targetType: 'property_report', targetId: report.id, action: 'property_report.create', reason: `Report ${input.report.reason}`, before: null, after: report, requestId: input.requestId, traceId: input.traceId, occurredAt: input.now }, session); return { kind: 'written', report }; }); } catch (error) { if (duplicate(error)) return { kind: 'duplicate' }; throw error; }
    },
    async list(query) {
      const filter: Record<string, unknown> = {}; if (query.status) filter.status = query.status; if (query.propertyId) filter.propertyId = new Types.ObjectId(query.propertyId);
      const [rows, total] = await Promise.all([models.PropertyReport.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), models.PropertyReport.countDocuments(filter)]);
      return { items: rows.map(row => stored(row as PropertyReportRecord & { _id: Types.ObjectId })), total };
    },
    async resolve(input) {
      return transaction(async session => {
        const target = input.action === 'resolve' ? 'resolved' : 'dismissed';
        const result = await models.PropertyReport.findOneAndUpdate({ _id: input.reportId, version: input.expectedVersion, status: { $in: ['open', 'in_review'] } }, { $set: { status: target, resolutionReason: input.reason, resolvedBy: new Types.ObjectId(input.adminId), resolvedAt: input.now, updatedAt: input.now }, $inc: { version: 1 } }, { new: true, runValidators: true, lean: true, session });
        if (!result) { const current = await models.PropertyReport.findById(input.reportId).lean().session(session); if (!current) return { kind: 'not_found' as const }; if (current.version !== input.expectedVersion) return { kind: 'version_conflict' as const }; return { kind: 'invalid_state' as const }; }
        const report = stored(result as PropertyReportRecord & { _id: Types.ObjectId }); await audit.record({ actorType: 'admin', actorId: input.adminId, targetType: 'property_report', targetId: report.id, action: `property_report.${input.action}`, reason: input.reason, before: null, after: report, requestId: input.requestId, traceId: input.traceId, occurredAt: input.now }, session); return { kind: 'written', report };
      });
    }
  };
}
