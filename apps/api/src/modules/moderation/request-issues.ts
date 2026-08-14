import { randomBytes } from 'node:crypto';
import type { AccessTokenClaims } from '../auth/crypto.js';
import { requestIssueCreateSchema, requestIssueListDataSchema, requestIssueResolveSchema, requestIssueSchema, type RequestIssue, type RequestIssueListData } from '@sadat-real-estate/contracts';

export type RequestIssueRecord = RequestIssue;
export interface RequestIssueRepository { create(issue: RequestIssueRecord): Promise<RequestIssueRecord>; list(page: number, limit: number): Promise<{ items: RequestIssueRecord[]; total: number }>; resolve(id: string, expectedVersion: number, status: 'resolved' | 'dismissed', reason: string, now: Date): Promise<RequestIssueRecord | undefined>; }
export class RequestIssueServiceError extends Error { constructor(readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'VERSION_CONFLICT') { super(code); } }
const id = () => randomBytes(12).toString('hex');
const canReport = (claims: AccessTokenClaims) => claims.status === 'verified' && ['seeker', 'provider', 'admin'].includes(claims.role);
export function createRequestIssueService(dependencies: { repository: RequestIssueRepository; now?: () => Date }) {
  const now = dependencies.now ?? (() => new Date());
  return {
    async create(claims: AccessTokenClaims, input: unknown): Promise<RequestIssue> { if (!canReport(claims)) throw new RequestIssueServiceError('FORBIDDEN'); const parsed = requestIssueCreateSchema.parse(input); const stamp = now(); return requestIssueSchema.parse(await dependencies.repository.create({ id: id(), requestId: parsed.requestId, category: parsed.category, details: parsed.details, status: 'open', version: 0, createdAt: stamp.toISOString(), updatedAt: stamp.toISOString() })); },
    async list(claims: AccessTokenClaims, page = 1, limit = 20): Promise<RequestIssueListData> { if (claims.role !== 'admin' || claims.status !== 'verified') throw new RequestIssueServiceError('FORBIDDEN'); const result = await dependencies.repository.list(page, limit); return requestIssueListDataSchema.parse({ items: result.items, page, limit, total: result.total }); },
    async resolve(claims: AccessTokenClaims, issueId: string, input: unknown): Promise<RequestIssue> { if (claims.role !== 'admin' || claims.status !== 'verified') throw new RequestIssueServiceError('FORBIDDEN'); const parsed = requestIssueResolveSchema.parse(input); const result = await dependencies.repository.resolve(issueId, parsed.expectedVersion, parsed.action === 'resolve' ? 'resolved' : 'dismissed', parsed.reason, now()); if (!result) throw new RequestIssueServiceError('NOT_FOUND'); return requestIssueSchema.parse(result); }
  };
}

export function createInMemoryRequestIssueRepository(seed: RequestIssueRecord[] = []): RequestIssueRepository {
  const rows = new Map(seed.map(item => [item.id, item]));
  return { async create(issue) { rows.set(issue.id, issue); return issue; }, async list(page, limit) { const all = [...rows.values()]; return { items: all.slice((page - 1) * limit, page * limit), total: all.length }; }, async resolve(issueId, expectedVersion, status, reason, now) { const row = rows.get(issueId); if (!row || row.version !== expectedVersion) return undefined; const updated = { ...row, status, resolutionReason: reason, version: row.version + 1, updatedAt: now.toISOString() }; rows.set(issueId, updated); return updated; } };
}
