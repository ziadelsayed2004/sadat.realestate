import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditAuthorization } from './service.js';
import { createAuditModels, type AuditModels } from './models.js';
import { createMongooseAuditRepository, type AuditRepository } from './repository.js';
import type { AuditRouterDependencies } from './router.js';
import { createAuditService } from './service.js';
import { createMongooseAuditWriter, type AuditWriter } from './writer.js';

export interface AuditInfrastructure {
  models: AuditModels;
  repository: AuditRepository;
  writer: AuditWriter;
}

export interface AuditRuntime extends AuditRouterDependencies {
  writer: AuditWriter;
}

export function createAuditInfrastructure(connection: Connection): AuditInfrastructure {
  const models = createAuditModels(connection);
  return {
    models,
    repository: createMongooseAuditRepository(models),
    writer: createMongooseAuditWriter(models)
  };
}

export function createAuditRuntime(
  accessTokens: AccessTokenService,
  authorization: AuditAuthorization,
  infrastructure: AuditInfrastructure
): AuditRuntime {
  return {
    accessTokens,
    writer: infrastructure.writer,
    service: createAuditService({
      repository: infrastructure.repository,
      authorization
    })
  };
}
