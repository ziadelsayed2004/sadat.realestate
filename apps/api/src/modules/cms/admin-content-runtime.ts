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

export function createCmsAdminContentRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  audit: AuditWriter,
  authorization: Pick<RbacService, 'authorize'>
): CmsAdminContentRouterDependencies {
  const aboutTeam = registerAboutTeamModels(connection);
  const populationTips = registerPopulationTipsModels(connection);
  const homepageDisplay = registerHomepageDisplayModels(connection);
  return {
    accessTokens,
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
      audit
    })
  };
}
