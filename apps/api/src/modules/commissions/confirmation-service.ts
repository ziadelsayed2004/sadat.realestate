import { randomBytes } from 'node:crypto';
import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  commissionConfirmationCreateSchema,
  commissionConfirmationListQuerySchema,
  commissionConfirmationListDataSchema,
  commissionConfirmationRevokeSchema,
  commissionConfirmationSchema,
  type CommissionConfirmation,
  type CommissionConfirmationListData,
  type CommissionConfirmationListQuery
} from '@sadat-real-estate/contracts';

type CommissionConfirmationErrorCode =
  | 'COMMISSION_CONFIRMATION_FORBIDDEN'
  | 'COMMISSION_CONFIRMATION_NOT_FOUND'
  | 'COMMISSION_CONFIRMATION_DUPLICATE'
  | 'COMMISSION_CONFIRMATION_VERSION_CONFLICT'
  | 'COMMISSION_CONFIRMATION_INVALID_STATE'
  | 'COMMISSION_CONFIRMATION_CONFLICT';

export class CommissionConfirmationServiceError extends Error {
  constructor(readonly code: CommissionConfirmationErrorCode) {
    super(code);
    this.name = 'CommissionConfirmationServiceError';
  }
}

const id = () => randomBytes(12).toString('hex');
const verified = (claims: AccessTokenClaims) => claims.status === 'verified';
const admin = (claims: AccessTokenClaims) => {
  if (claims.role !== 'admin' || !verified(claims)) throw new CommissionConfirmationServiceError('COMMISSION_CONFIRMATION_FORBIDDEN');
};
const providerOwner = (claims: AccessTokenClaims, accountId: string) => {
  if (claims.role !== 'provider' || !verified(claims) || claims.sub !== accountId) throw new CommissionConfirmationServiceError('COMMISSION_CONFIRMATION_FORBIDDEN');
};

export function createCommissionConfirmationService(seed: { confirmations?: CommissionConfirmation[]; now?: () => Date } = {}) {
  const confirmations = new Map((seed.confirmations ?? []).map(item => [item.id, item]));
  const clock = seed.now ?? (() => new Date());
  const now = () => clock().toISOString();
  const get = (confirmationId: string) => {
    const confirmation = confirmations.get(confirmationId);
    if (!confirmation) throw new CommissionConfirmationServiceError('COMMISSION_CONFIRMATION_NOT_FOUND');
    return confirmation;
  };
  const eventKey = (accountId: string, policyVersion: number) => `${accountId}:${policyVersion}`;
  const sameSource = (left: CommissionConfirmation, right: { source: CommissionConfirmation['source']; sourceRecordId: string; policyVersion: number; effectiveAt: string }) =>
    left.source === right.source && left.sourceRecordId === right.sourceRecordId && left.policyVersion === right.policyVersion && left.effectiveAt === right.effectiveAt;

  return {
    async acknowledge(claims: AccessTokenClaims, input: unknown) {
      const parsed = commissionConfirmationCreateSchema.parse(input);
      providerOwner(claims, parsed.accountId);
      const { acknowledge: _acknowledge, ...confirmationInput } = parsed;
      void _acknowledge;
      const key = eventKey(parsed.accountId, parsed.policyVersion);
      const existing = [...confirmations.values()].find(item => eventKey(item.accountId, item.policyVersion) === key);
      if (existing) {
        if (existing.status === 'acknowledged' && sameSource(existing, confirmationInput)) return existing;
        throw new CommissionConfirmationServiceError(existing.status === 'revoked' ? 'COMMISSION_CONFIRMATION_INVALID_STATE' : 'COMMISSION_CONFIRMATION_CONFLICT');
      }
      const stamp = now();
      for (const item of confirmations.values()) {
        if (item.accountId === parsed.accountId && item.status === 'acknowledged') {
          confirmations.set(item.id, commissionConfirmationSchema.parse({ ...item, status: 'superseded', version: item.version + 1, updatedAt: stamp }));
        }
      }
      const confirmation = commissionConfirmationSchema.parse({
        id: id(),
        ...confirmationInput,
        status: 'acknowledged',
        acknowledgedAt: stamp,
        acknowledgedBy: claims.sub,
        version: 0,
        createdAt: stamp,
        updatedAt: stamp
      });
      confirmations.set(confirmation.id, confirmation);
      return confirmation;
    },
    async getConfirmation(claims: AccessTokenClaims, confirmationId: string) {
      const confirmation = get(confirmationId);
      if (claims.role === 'admin' && verified(claims)) return confirmation;
      providerOwner(claims, confirmation.accountId);
      return confirmation;
    },
    async listConfirmations(claims: AccessTokenClaims, input: unknown): Promise<CommissionConfirmationListData> {
      const query = commissionConfirmationListQuerySchema.parse(input) as CommissionConfirmationListQuery;
      const scopedAccountId = query.accountId ?? (claims.role === 'provider' ? claims.sub : undefined);
      if (claims.role === 'admin' && verified(claims)) {
        // Administrative lists may be filtered by any account.
      } else {
        providerOwner(claims, scopedAccountId ?? '');
      }
      const values = [...confirmations.values()]
        .filter(item => (!scopedAccountId || item.accountId === scopedAccountId) && (!query.source || item.source === query.source) && (!query.status || item.status === query.status) && (claims.role === 'admin' || item.accountId === claims.sub))
        .sort((a, b) => b.acknowledgedAt.localeCompare(a.acknowledgedAt) || b.policyVersion - a.policyVersion || a.id.localeCompare(b.id));
      return commissionConfirmationListDataSchema.parse({ items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length });
    },
    async revoke(claims: AccessTokenClaims, confirmationId: string, input: unknown) {
      admin(claims);
      const current = get(confirmationId);
      const parsed = commissionConfirmationRevokeSchema.parse(input);
      if (parsed.expectedVersion !== current.version) throw new CommissionConfirmationServiceError('COMMISSION_CONFIRMATION_VERSION_CONFLICT');
      if (current.status === 'revoked') throw new CommissionConfirmationServiceError('COMMISSION_CONFIRMATION_INVALID_STATE');
      const stamp = now();
      const next = commissionConfirmationSchema.parse({ ...current, status: 'revoked', revokedAt: stamp, revokedBy: claims.sub, revokeReason: parsed.reason, version: current.version + 1, updatedAt: stamp });
      confirmations.set(next.id, next);
      return next;
    }
  };
}
