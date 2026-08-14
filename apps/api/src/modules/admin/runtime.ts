import type { Connection } from 'mongoose';
import { createArgon2PasswordHasher } from '../auth/crypto.js';
import { createAuthModels } from '../auth/models.js';
import { createIdentityModels } from '../identity/models.js';
import { createAdminModels } from './models.js';
import { createMongooseAdminRepository } from './repository.js';
import { createAdminBootstrapService, type AdminBootstrapService } from './service.js';

export function createAdminBootstrapRuntime(connection: Connection): AdminBootstrapService {
  const identityModels = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  const adminModels = createAdminModels(connection);
  return createAdminBootstrapService({
    repository: createMongooseAdminRepository(connection, identityModels, authModels, adminModels),
    passwordHasher: createArgon2PasswordHasher()
  });
}
