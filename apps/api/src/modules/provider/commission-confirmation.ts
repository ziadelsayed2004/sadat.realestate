import {
  providerCommissionConfirmationRequestSchema,
  providerCommissionConfirmationSchema,
  type ProviderCommissionConfirmation
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import {
  CommissionConfirmationServiceError,
  type CommissionConfirmationService
} from '../commissions/confirmation-service.js';
import type { ProviderCommissionSource } from './commission.js';

export type ProviderCommissionConfirmationErrorCode =
  | 'PROVIDER_COMMISSION_CONFIRMATION_FORBIDDEN'
  | 'PROVIDER_COMMISSION_CONFIRMATION_NOT_FOUND'
  | 'PROVIDER_COMMISSION_CONFIRMATION_VERSION_CONFLICT'
  | 'PROVIDER_COMMISSION_CONFIRMATION_CONFLICT'
  | 'PROVIDER_COMMISSION_CONFIRMATION_SOURCE_INVALID';

export class ProviderCommissionConfirmationError extends Error {
  constructor(readonly code: ProviderCommissionConfirmationErrorCode) {
    super(code);
    this.name = 'ProviderCommissionConfirmationError';
  }
}

export interface ProviderCommissionConfirmationDependencies {
  source: ProviderCommissionSource;
  confirmations: Pick<CommissionConfirmationService, 'acknowledge'>;
}

function provider(claims: AccessTokenClaims): void {
  if (claims.role !== 'provider' || claims.status !== 'verified' || !/^[a-f0-9]{24}$/.test(claims.sub)) {
    throw new ProviderCommissionConfirmationError('PROVIDER_COMMISSION_CONFIRMATION_FORBIDDEN');
  }
}

export function createProviderCommissionConfirmationService(
  dependencies: ProviderCommissionConfirmationDependencies
) {
  return {
    async confirm(claims: AccessTokenClaims, input: unknown): Promise<ProviderCommissionConfirmation> {
      provider(claims);
      const request = providerCommissionConfirmationRequestSchema.parse(input);
      const resolution = await dependencies.source.getForProvider(claims.sub);
      if (!resolution || resolution.source === 'none') {
        throw new ProviderCommissionConfirmationError('PROVIDER_COMMISSION_CONFIRMATION_NOT_FOUND');
      }
      if (
        resolution.sourceVersion === undefined ||
        resolution.sourceRecordId === undefined ||
        request.policyVersion !== resolution.sourceVersion
      ) {
        throw new ProviderCommissionConfirmationError('PROVIDER_COMMISSION_CONFIRMATION_VERSION_CONFLICT');
      }
      try {
        const confirmation = await dependencies.confirmations.acknowledge(claims, {
          accountId: claims.sub,
          source: resolution.source,
          sourceRecordId: resolution.sourceRecordId,
          policyVersion: resolution.sourceVersion,
          ...(resolution.policyId ? { policyId: resolution.policyId } : {}),
          ...(resolution.exceptionId ? { exceptionId: resolution.exceptionId } : {}),
          ...(resolution.accountOverrideId ? { accountOverrideId: resolution.accountOverrideId } : {}),
          effectiveAt: resolution.effectiveAt,
          acknowledge: true
        });
        return providerCommissionConfirmationSchema.parse({
          confirmationId: confirmation.id,
          policyVersion: confirmation.policyVersion,
          status: confirmation.status,
          effectiveAt: confirmation.effectiveAt,
          acknowledgedAt: confirmation.acknowledgedAt
        });
      } catch (error) {
        if (error instanceof CommissionConfirmationServiceError) {
          if (error.code === 'COMMISSION_CONFIRMATION_FORBIDDEN') {
            throw new ProviderCommissionConfirmationError('PROVIDER_COMMISSION_CONFIRMATION_FORBIDDEN');
          }
          if (error.code === 'COMMISSION_CONFIRMATION_NOT_FOUND') {
            throw new ProviderCommissionConfirmationError('PROVIDER_COMMISSION_CONFIRMATION_NOT_FOUND');
          }
          if (error.code === 'COMMISSION_CONFIRMATION_VERSION_CONFLICT') {
            throw new ProviderCommissionConfirmationError('PROVIDER_COMMISSION_CONFIRMATION_VERSION_CONFLICT');
          }
          throw new ProviderCommissionConfirmationError('PROVIDER_COMMISSION_CONFIRMATION_CONFLICT');
        }
        throw error;
      }
    }
  };
}

export type ProviderCommissionConfirmationService = ReturnType<typeof createProviderCommissionConfirmationService>;
