import {
  adminBootstrapInputSchema,
  type AdminBootstrapData,
  type AdminBootstrapInput
} from '@sadat-real-estate/contracts';
import type { PasswordHasher } from '../auth/crypto.js';
import type { AdminRepository } from './repository.js';

export type AdminServiceErrorCode =
  | 'ADMIN_BOOTSTRAP_ALREADY_COMPLETED'
  | 'ADMINISTRATOR_ALREADY_EXISTS'
  | 'ADMIN_BOOTSTRAP_CONFLICT';

export class AdminServiceError extends Error {
  readonly code: AdminServiceErrorCode;

  constructor(code: AdminServiceErrorCode) {
    super(code);
    this.name = 'AdminServiceError';
    this.code = code;
  }
}

export interface AdminBootstrapService {
  bootstrap(input: AdminBootstrapInput): Promise<AdminBootstrapData>;
}

export interface AdminBootstrapServiceDependencies {
  repository: AdminRepository;
  passwordHasher: PasswordHasher;
  now?: () => Date;
}

export function createAdminBootstrapService(
  dependencies: AdminBootstrapServiceDependencies
): AdminBootstrapService {
  const now = dependencies.now ?? (() => new Date());
  return {
    async bootstrap(unparsedInput) {
      const input = adminBootstrapInputSchema.parse(unparsedInput);
      const bootstrappedAt = now();
      const passwordHash = await dependencies.passwordHasher.hash(input.password);
      const result = await dependencies.repository.createFirstSuperAdmin({
        email: input.email,
        locale: input.locale,
        passwordHash,
        now: bootstrappedAt
      });
      if (result.kind === 'already_bootstrapped') {
        throw new AdminServiceError('ADMIN_BOOTSTRAP_ALREADY_COMPLETED');
      }
      if (result.kind === 'administrator_exists') {
        throw new AdminServiceError('ADMINISTRATOR_ALREADY_EXISTS');
      }
      if (result.kind === 'concurrent_conflict') {
        throw new AdminServiceError('ADMIN_BOOTSTRAP_CONFLICT');
      }
      return {
        adminId: result.adminId,
        email: input.email,
        accessLevel: 'super_admin',
        status: 'verified',
        bootstrappedAt: bootstrappedAt.toISOString()
      };
    }
  };
}
