import { randomBytes } from 'node:crypto';
import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  commissionExceptionCreateSchema,
  commissionExceptionListQuerySchema,
  commissionExceptionPatchSchema,
  commissionExceptionSchema,
  type CommissionException,
  type CommissionExceptionListData,
  type CommissionExceptionListQuery
} from '@sadat-real-estate/contracts';
import type { CommissionExceptionRepository } from './exception-repository.js';

type CommissionExceptionErrorCode =
  | 'COMMISSION_EXCEPTION_FORBIDDEN'
  | 'COMMISSION_EXCEPTION_NOT_FOUND'
  | 'COMMISSION_EXCEPTION_DUPLICATE'
  | 'COMMISSION_EXCEPTION_VERSION_CONFLICT'
  | 'COMMISSION_EXCEPTION_INVALID_STATE'
  | 'COMMISSION_EXCEPTION_OVERLAP';

export class CommissionExceptionServiceError extends Error {
  constructor(readonly code: CommissionExceptionErrorCode) {
    super(code);
    this.name = 'CommissionExceptionServiceError';
  }
}

const id = () => randomBytes(12).toString('hex');
const admin = (claims: AccessTokenClaims) => {
  if (claims.role !== 'admin' || claims.status !== 'verified') throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_FORBIDDEN');
};
const validAccountId = (accountId: string) => /^[a-f0-9]{24}$/.test(accountId);
const overlaps = (left: { effectiveFrom: string; effectiveTo?: string | undefined }, right: { effectiveFrom: string; effectiveTo?: string | undefined }): boolean =>
  left.effectiveFrom < (right.effectiveTo ?? '9999-12-31T23:59:59.999Z') && right.effectiveFrom < (left.effectiveTo ?? '9999-12-31T23:59:59.999Z');
const applies = (item: { effectiveFrom: string; effectiveTo?: string | undefined; status: string }, at: Date) =>
  item.status === 'active' && new Date(item.effectiveFrom).getTime() <= at.getTime() && (!item.effectiveTo || new Date(item.effectiveTo).getTime() > at.getTime());

export function createCommissionExceptionService(seed: { exceptions?: CommissionException[]; now?: () => Date; repository?: CommissionExceptionRepository } = {}) {
  const exceptions = new Map((seed.exceptions ?? []).map(item => [item.id, item]));
  const repository = seed.repository;
  const clock = seed.now ?? (() => new Date());
  const now = () => clock().toISOString();
  const all = async (): Promise<CommissionException[]> => repository ? repository.list() : [...exceptions.values()];
  const get = async (exceptionId: string) => {
    const exception = repository ? await repository.findById(exceptionId) : exceptions.get(exceptionId);
    if (!exception) throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_NOT_FOUND');
    return exception;
  };
  const validateActive = async (exception: CommissionException, existing: readonly CommissionException[]) => {
    if (exception.status !== 'active') return;
    const current = clock();
    if (!applies(exception, current)) throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_INVALID_STATE');
    if (existing.some(item => item.id !== exception.id && item.accountId === exception.accountId && item.status === 'active' && overlaps(item, exception))) {
      throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_OVERLAP');
    }
  };
  const validateMutation = (current: CommissionException, next: CommissionException) => {
    if (current.status !== 'active') return;
    const changedEffectiveOrValue = current.accountId !== next.accountId || current.kind !== next.kind || current.percentageBps !== next.percentageBps || current.fixedAmountMinor !== next.fixedAmountMinor || current.currency !== next.currency || current.effectiveFrom !== next.effectiveFrom || current.effectiveTo !== next.effectiveTo || current.reason !== next.reason;
    if (next.status === 'active' && changedEffectiveOrValue) throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_INVALID_STATE');
    if (next.status === 'draft') throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_INVALID_STATE');
  };

  const materialize = (current: CommissionException, patch: Record<string, unknown>, actor: AccessTokenClaims['sub'], mutationReason: string) => {
    const nextInput: Record<string, unknown> = {
      ...current,
      ...patch,
      version: current.version + 1,
      updatedBy: actor,
      updatedAt: now(),
      lastMutationReason: mutationReason
    };
    if (patch.percentageBps === null) delete nextInput.percentageBps;
    if (patch.fixedAmountMinor === null) delete nextInput.fixedAmountMinor;
    if (patch.currency === null) delete nextInput.currency;
    if (patch.effectiveTo === null) delete nextInput.effectiveTo;
    if (patch.exceptionReason !== undefined) nextInput.reason = patch.exceptionReason;
    delete nextInput.exceptionReason;
    if (nextInput.status === 'active') {
      nextInput.approvedBy = actor;
      nextInput.approvedAt = nextInput.approvedAt ?? now();
      nextInput.approvalReason = mutationReason;
    }
    return commissionExceptionSchema.parse(nextInput);
  };

  return {
    async createException(claims: AccessTokenClaims, input: unknown) {
      admin(claims);
      const parsed = commissionExceptionCreateSchema.parse(input);
      if (!validAccountId(parsed.accountId)) throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_NOT_FOUND');
      if ((await all()).some(item => item.accountId === parsed.accountId && item.effectiveFrom === parsed.effectiveFrom)) throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_DUPLICATE');
      const stamp = now();
      const exception = commissionExceptionSchema.parse({
        id: id(),
        ...parsed,
        status: 'draft',
        source: 'exception',
        version: 0,
        createdBy: claims.sub,
        updatedBy: claims.sub,
        createdAt: stamp,
        updatedAt: stamp,
        lastMutationReason: parsed.reason
      });
      if (repository) {
        const result = await repository.insert(exception);
        if (result.kind === 'duplicate') throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_DUPLICATE');
      } else {
        exceptions.set(exception.id, exception);
      }
      return exception;
    },
    async getException(claims: AccessTokenClaims, exceptionId: string) {
      admin(claims);
      return get(exceptionId);
    },
    async listExceptions(claims: AccessTokenClaims, input: unknown): Promise<CommissionExceptionListData> {
      admin(claims);
      const query = commissionExceptionListQuerySchema.parse(input) as CommissionExceptionListQuery;
      const at = query.at ? new Date(query.at) : undefined;
      const values = (await all())
        .filter(item => (!query.accountId || item.accountId === query.accountId) && (!query.status || item.status === query.status) && (!at || applies(item, at)))
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.accountId.localeCompare(b.accountId) || a.id.localeCompare(b.id));
      return { items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length };
    },
    async updateException(claims: AccessTokenClaims, exceptionId: string, input: unknown) {
      admin(claims);
      const current = await get(exceptionId);
      const parsed = commissionExceptionPatchSchema.parse(input);
      if (parsed.expectedVersion !== current.version) throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_VERSION_CONFLICT');
      const { expectedVersion: _expectedVersion, reason: mutationReason, ...patch } = parsed;
      void _expectedVersion;
      const next = materialize(current, patch, claims.sub, mutationReason);
      validateMutation(current, next);
      await validateActive(next, await all());
      if (repository) {
        const result = await repository.replace(next, current.version);
        if (result.kind === 'not_found') throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_NOT_FOUND');
        if (result.kind === 'version_conflict') throw new CommissionExceptionServiceError('COMMISSION_EXCEPTION_VERSION_CONFLICT');
      } else {
        exceptions.set(next.id, next);
      }
      return next;
    },
    async activateException(claims: AccessTokenClaims, exceptionId: string, expectedVersion: number, reason: string) {
      return this.updateException(claims, exceptionId, { expectedVersion, reason, status: 'active' });
    },
    async findActiveException(accountId: string, at: Date = clock()) {
      if (!validAccountId(accountId)) return undefined;
      return (await all())
        .filter(item => item.accountId === accountId && applies(item, at))
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version || b.id.localeCompare(a.id))[0];
    }
  };
}

export type CommissionExceptionService = ReturnType<typeof createCommissionExceptionService>;
