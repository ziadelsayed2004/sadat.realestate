import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import { registerAboutTeamModels } from './about-team-models.js';
import { type CmsAdminContentRouterDependencies } from './admin-content-router.js';
import { createMongooseCmsAdminContentRepository } from './admin-content-repository.js';
import { createCmsAdminContentService } from './admin-content-service.js';
import { registerPopulationTipsModels } from './population-models.js';
import { registerHomepageDisplayModels } from './homepage-display-models.js';
import type { UploadEnvironment } from '../uploads/environment.js';
import { createInMemoryStorageAdapter, createLocalFilesystemStorageAdapter, createUnavailableStorageAdapter, createClamAvMalwareScanner, createDeterministicMalwareScanner, createUnavailableMalwareScanner } from '../uploads/adapters.js';
import { createTeamPhotos } from './team-photos.js';

export function createCmsAdminContentRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  audit: AuditWriter,
  authorization: Pick<RbacService, 'authorize'>,
  environment: UploadEnvironment
): CmsAdminContentRouterDependencies {
  connection.base.set('transactionAsyncLocalStorage', true);
  const aboutTeam = registerAboutTeamModels(connection);
  const populationTips = registerPopulationTipsModels(connection);
  const homepageDisplay = registerHomepageDisplayModels(connection);
  const photos = createTeamPhotos({ connection, authorization, audit,
    storage: environment.mode === 'memory' ? createInMemoryStorageAdapter() : environment.mode === 'local-filesystem' ? createLocalFilesystemStorageAdapter(environment.localRoot!) : createUnavailableStorageAdapter(),
    scanner: environment.scannerMode === 'clamav' && environment.clamav ? createClamAvMalwareScanner(environment.clamav) : environment.scannerMode === 'deterministic-fake' ? createDeterministicMalwareScanner('clean') : createUnavailableMalwareScanner() });
  return {
    accessTokens,
    photos,
    service: createCmsAdminContentService({
      repository: createMongooseCmsAdminContentRepository({
        about: aboutTeam.about,
        team: aboutTeam.team,
        population: populationTips.population,
        tips: populationTips.tips,
        sections: homepageDisplay.sections,
        settings: homepageDisplay.settings
      }),
      authorization,
      audit,
      validateTeamPhoto: photos.validateAttach,
      transaction: operation => connection.transaction(operation)
    })
  };
}
