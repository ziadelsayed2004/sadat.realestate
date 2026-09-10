import type { Connection } from 'mongoose';
import { createMongoosePublicHomepageRepository, createPublicHomepageService } from './homepage.js';
import { createMongoosePublicPropertyDetailsRepository, createPublicPropertyDetailsService } from './properties.js';
import type { PublicRouterDependencies } from './router.js';
import { createMongoosePropertySettingsReader } from '../settings/property-policy.js';
import { createMongooseDisplaySettingsReader } from '../settings/display-policy.js';
import type { AccessTokenService } from '../auth/crypto.js';
import { createPublicBootstrapService } from './bootstrap.js';
import { createMongoosePublicSitemapSource, createPublicSitemapService } from './sitemap.js';

export function createPublicRuntime(connection: Connection, accessTokens?: AccessTokenService): PublicRouterDependencies {
  const displaySettings = createMongooseDisplaySettingsReader(connection);
  return {
    service: createPublicHomepageService({ repository: createMongoosePublicHomepageRepository(connection), displaySettings }),
    details: createPublicPropertyDetailsService({ repository: createMongoosePublicPropertyDetailsRepository(connection), settings: createMongoosePropertySettingsReader(connection) }),
    bootstrap: createPublicBootstrapService(displaySettings),
    sitemap: createPublicSitemapService(createMongoosePublicSitemapSource(connection)),
    ...(accessTokens ? { accessTokens } : {})
  };
}
