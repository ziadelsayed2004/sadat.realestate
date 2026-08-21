import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  commissionResolutionSchema,
  providerCommissionProjectionSchema,
  type CommissionResolution,
  type ProviderCommissionProjection
} from '@sadat-real-estate/contracts';

/**
 * Provider code consumes a resolver-owned read model only. This adapter does
 * not expose any acknowledge, revoke, or mutation operation.
 */
export interface ProviderCommissionSource {
  getForProvider(providerId: string): Promise<CommissionResolution | undefined>;
}

export interface ProviderCommissionProjectionDependencies {
  source: ProviderCommissionSource;
  now?: () => Date;
}

export type ProviderCommissionProjectionErrorCode =
  | 'PROVIDER_COMMISSION_FORBIDDEN'
  | 'PROVIDER_COMMISSION_NOT_FOUND'
  | 'PROVIDER_COMMISSION_SOURCE_INVALID';

export class ProviderCommissionProjectionError extends Error {
  constructor(readonly code: ProviderCommissionProjectionErrorCode) {
    super(code);
    this.name = 'ProviderCommissionProjectionError';
  }
}

function providerClaims(claims: AccessTokenClaims): void {
  if (claims.role !== 'provider' || claims.status !== 'verified') {
    throw new ProviderCommissionProjectionError('PROVIDER_COMMISSION_FORBIDDEN');
  }
}

function project(
  providerId: string,
  record: CommissionResolution | undefined,
  now: () => Date
): ProviderCommissionProjection {
  if (!record) {
    return providerCommissionProjectionSchema.parse({
      accountId: providerId,
      source: 'none',
      effectiveAt: now().toISOString(),
      readOnly: true
    });
  }

  const parsed = commissionResolutionSchema.safeParse(record);
  if (!parsed.success) throw new ProviderCommissionProjectionError('PROVIDER_COMMISSION_SOURCE_INVALID');
  if (parsed.data.accountId !== providerId) throw new ProviderCommissionProjectionError('PROVIDER_COMMISSION_NOT_FOUND');

  if (parsed.data.source === 'none') {
    return providerCommissionProjectionSchema.parse({
      accountId: providerId,
      source: 'none',
      effectiveAt: parsed.data.effectiveAt,
      readOnly: true
    });
  }
  if (parsed.data.sourceVersion === undefined || parsed.data.kind === undefined) {
    throw new ProviderCommissionProjectionError('PROVIDER_COMMISSION_SOURCE_INVALID');
  }

  return providerCommissionProjectionSchema.parse({
    accountId: providerId,
    source: parsed.data.source,
    effectiveAt: parsed.data.effectiveAt,
    policyVersion: parsed.data.sourceVersion,
    kind: parsed.data.kind,
    ...(parsed.data.percentageBps !== undefined ? { percentageBps: parsed.data.percentageBps } : {}),
    ...(parsed.data.fixedAmountMinor !== undefined ? { fixedAmountMinor: parsed.data.fixedAmountMinor } : {}),
    ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency } : {}),
    readOnly: true
  });
}

export function createProviderCommissionProjectionService(dependencies: ProviderCommissionProjectionDependencies) {
  const clock = dependencies.now ?? (() => new Date());
  const get = async (claims: AccessTokenClaims): Promise<ProviderCommissionProjection> => {
    providerClaims(claims);
    if (!/^[a-f0-9]{24}$/.test(claims.sub)) throw new ProviderCommissionProjectionError('PROVIDER_COMMISSION_FORBIDDEN');
    const record = await dependencies.source.getForProvider(claims.sub);
    return project(claims.sub, record, clock);
  };
  return {
    get,
    getCommission: get,
    read: get,
    validateProjection: (value: unknown) => providerCommissionProjectionSchema.parse(value)
  };
}

export type ProviderCommissionProjectionService = ReturnType<typeof createProviderCommissionProjectionService>;
