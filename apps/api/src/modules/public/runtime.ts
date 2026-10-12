import type { Connection } from 'mongoose';
import { createMongoosePublicHomepageRepository, createPublicHomepageService } from './homepage.js';
import { createMongoosePublicPropertyDetailsRepository, createPublicPropertyDetailsService } from './properties.js';
import type { PublicRouterDependencies } from './router.js';
import { createMongoosePropertySettingsReader } from '../settings/property-policy.js';
import { createMongooseDisplaySettingsReader } from '../settings/display-policy.js';
import { createMongoosePublicContactSettingsReader } from '../settings/contact-policy.js';
import type { AccessTokenService } from '../auth/crypto.js';
import { createPublicBootstrapService } from './bootstrap.js';
import { createMongoosePublicSitemapSource, createPublicSitemapService } from './sitemap.js';
import { mongooseAutomaticPopulationReader } from '../cms/automatic-population.js';
import { createMongoosePropertyViews } from './property-views.js';

export function createPublicRuntime(connection: Connection, accessTokens?: AccessTokenService): PublicRouterDependencies {
  const displaySettings = createMongooseDisplaySettingsReader(connection);
  return {
    views: createMongoosePropertyViews(connection),
    service: createPublicHomepageService({ repository: createMongoosePublicHomepageRepository(connection), displaySettings, automaticPopulation: mongooseAutomaticPopulationReader(connection) }),
    details: createPublicPropertyDetailsService({ repository: createMongoosePublicPropertyDetailsRepository(connection), settings: createMongoosePropertySettingsReader(connection) }),
    bootstrap: createPublicBootstrapService(displaySettings, createMongoosePublicContactSettingsReader(connection)),
    sitemap: createPublicSitemapService(createMongoosePublicSitemapSource(connection)),
    ...(accessTokens ? { accessTokens } : {})
  };
}
