import express, { type Express } from 'express';
import { createOperationalRouter } from './modules/database/health.js';
import type { DatabaseReadiness } from './modules/database/connection.js';
import {
  createSecurityErrorHandler,
  createSecurityMiddleware,
  resolveSecurityOptions,
  type SecurityOptions
} from './modules/security/middleware.js';
import {
  createRequestObservabilityMiddleware,
  type ObservabilityOptions
} from './modules/observability/middleware.js';
import { createAuthRouter, type AuthRouterDependencies } from './modules/auth/router.js';
import { createSeekerRouter, type SeekerRouterDependencies } from './modules/seeker/router.js';
import { createProviderRouter, type ProviderRouterDependencies } from './modules/provider/router.js';
import { createPaymentProofRouter, type PaymentProofRouterDependencies } from './modules/payments/router.js';
import { createUploadRouter, type UploadRouterDependencies } from './modules/uploads/router.js';
import { createRbacRouter, type RbacRouterDependencies } from './modules/rbac/router.js';
import {
  createAccountRouter,
  type AccountRouterDependencies
} from './modules/accounts/router.js';
import { createAuditRouter, type AuditRouterDependencies } from './modules/audit/router.js';
import { createLocationRouter, type LocationRouterDependencies } from './modules/locations/router.js';
import { createTaxonomyRouter, type TaxonomyRouterDependencies } from './modules/taxonomy/router.js';
import { createFeatureRouter, type FeatureService } from './modules/taxonomy/features.js';
import { createProjectRouter, type ProjectRouterDependencies } from './modules/projects/router.js';
import { createPropertyRouter, type PropertyRouterDependencies } from './modules/properties/router.js';
import { createPropertyMediaRouter, type PropertyMediaRouterDependencies } from './modules/media/router.js';
import { createModerationRouter, type ModerationRouterDependencies } from './modules/moderation/router.js';
import { createPublicRouter, type PublicRouterDependencies } from './modules/public/router.js';
import { createPublicSearchRouter, type PublicSearchRouterDependencies } from './modules/search/router.js';
import { createPublicCompareRouter, type PublicCompareRouterDependencies } from './modules/compare/router.js';
import { createPublicOrganizationRouter, type PublicOrganizationRouterDependencies } from './modules/organizations/router.js';
import { createFavoriteRouter, type FavoriteRouterDependencies } from './modules/favorites/router.js';
import { createNotificationRouter, type NotificationRouterDependencies } from './modules/notifications/router.js';
import { createSettingsRouter, type SettingsRouterDependencies } from './modules/settings/router.js';
import { createRequestRouter, type RequestRouterDependencies } from './modules/requests/router.js';
import { createViewingRouter, type ViewingRouterDependencies } from './modules/viewings/router.js';
import { createArticleRouter, type ArticleRouterDependencies } from './modules/articles/router.js';
import { createCommunityRouter, type CommunityRouterDependencies } from './modules/community/router.js';
import { createPublicAboutTeamRouter, type PublicAboutTeamRouterDependencies } from './modules/cms/public-router.js';
import { createCmsAdminContentRouter, type CmsAdminContentRouterDependencies } from './modules/cms/admin-content-router.js';
import { createAdminOverviewRouter, type AdminOverviewRouterDependencies } from './modules/admin/overview-router.js';
import { createAdministratorRouter, type AdministratorRouterDependencies } from './modules/admin/administrator-router.js';
import { createAdminAdsRouter, type AdminAdsRouterDependencies } from './modules/ads/admin-router.js';
import { createAdminBannerRouter, type AdminBannerRouterDependencies } from './modules/ads/banner-router.js';
import { createAdvertisingLedgerRouter, type AdvertisingLedgerRouterDependencies } from './modules/reports/advertising-ledger-router.js';
import { createCommissionPolicyRouter, type CommissionPolicyRouterDependencies } from './modules/commissions/policy-router.js';
import { createCommissionAccountRouter, type CommissionAccountRouterDependencies } from './modules/commissions/account-router.js';
import { createCommissionExceptionRouter, type CommissionExceptionRouterDependencies } from './modules/commissions/exception-router.js';
import { createCommissionConfirmationRouter, type CommissionConfirmationRouterDependencies } from './modules/commissions/confirmation-router.js';
import { createCommissionChangeLogRouter, type CommissionChangeLogRouterDependencies } from './modules/commissions/change-log-router.js';

export interface AppDependencies {
  database: DatabaseReadiness;
  auth?: AuthRouterDependencies;
  seeker?: SeekerRouterDependencies;
  provider?: ProviderRouterDependencies;
  payments?: PaymentProofRouterDependencies;
  uploads?: UploadRouterDependencies & { readiness?: { isReady(): boolean | Promise<boolean> } };
  rbac?: RbacRouterDependencies;
  accounts?: AccountRouterDependencies;
  audit?: AuditRouterDependencies;
  locations?: LocationRouterDependencies;
  taxonomy?: TaxonomyRouterDependencies;
  features?: { service: FeatureService; accessTokens: import('./modules/auth/crypto.js').AccessTokenService };
  projects?: ProjectRouterDependencies;
  properties?: PropertyRouterDependencies;
  propertyMedia?: PropertyMediaRouterDependencies;
  moderation?: ModerationRouterDependencies;
  publicHomepage?: PublicRouterDependencies;
  publicSearch?: PublicSearchRouterDependencies;
  publicCompare?: PublicCompareRouterDependencies;
  publicOrganizations?: PublicOrganizationRouterDependencies;
  favorites?: FavoriteRouterDependencies;
  notifications?: NotificationRouterDependencies;
  settings?: SettingsRouterDependencies;
  requests?: RequestRouterDependencies;
  viewings?: ViewingRouterDependencies;
  articles?: ArticleRouterDependencies;
  community?: CommunityRouterDependencies;
  publicAboutTeam?: PublicAboutTeamRouterDependencies;
  cmsAdminContent?: CmsAdminContentRouterDependencies;
  adminOverview?: AdminOverviewRouterDependencies;
  administrators?: AdministratorRouterDependencies;
  adminAds?: AdminAdsRouterDependencies;
  adminBanners?: AdminBannerRouterDependencies;
  advertisingLedger?: AdvertisingLedgerRouterDependencies;
  commissionPolicies?: CommissionPolicyRouterDependencies;
  commissionAccounts?: CommissionAccountRouterDependencies;
  commissionExceptions?: CommissionExceptionRouterDependencies;
  commissionConfirmations?: CommissionConfirmationRouterDependencies;
  commissionChangeLog?: CommissionChangeLogRouterDependencies;
  security?: SecurityOptions;
  observability?: ObservabilityOptions;
}

/**
 * Creates the operational application shell. Product routes and later middleware
 * remain owned by their dependency-ready tasks.
 */
export function createApp(dependencies: AppDependencies): Express {
  if (!dependencies?.database || typeof dependencies.database.isReady !== 'function') {
    throw new Error('Database readiness dependency is required');
  }
  const app = express();
  const security = resolveSecurityOptions(dependencies.security);
  app.set('trust proxy', security.trustProxy);
  app.use(createRequestObservabilityMiddleware(dependencies.observability));
  for (const middleware of createSecurityMiddleware(security)) app.use(middleware);
  app.use(createOperationalRouter(dependencies.database, dependencies.auth?.otpService, dependencies.uploads?.readiness));
  if (dependencies.auth) app.use('/api/v1/auth', createAuthRouter(dependencies.auth));
  if (dependencies.accounts?.accessGuard) {
    app.use('/api/v1', dependencies.accounts.accessGuard);
  }
  if (dependencies.seeker) app.use('/api/v1', createSeekerRouter(dependencies.seeker));
  if (dependencies.provider) app.use('/api/v1', createProviderRouter(dependencies.provider));
  if (dependencies.adminAds) app.use('/api/v1', createAdminAdsRouter(dependencies.adminAds));
  if (dependencies.adminBanners) app.use('/api/v1', createAdminBannerRouter(dependencies.adminBanners));
  if (dependencies.payments) app.use('/api/v1', createPaymentProofRouter(dependencies.payments));
  if (dependencies.uploads) app.use('/api/v1', createUploadRouter(dependencies.uploads));
  if (dependencies.rbac) app.use('/api/v1', createRbacRouter(dependencies.rbac));
  if (dependencies.accounts) app.use('/api/v1', createAccountRouter(dependencies.accounts));
  if (dependencies.audit) app.use('/api/v1', createAuditRouter(dependencies.audit));
  if (dependencies.locations) app.use('/api/v1', createLocationRouter(dependencies.locations));
  if (dependencies.taxonomy) app.use('/api/v1', createTaxonomyRouter(dependencies.taxonomy));
  if (dependencies.features) app.use('/api/v1', createFeatureRouter(dependencies.features.service, dependencies.features.accessTokens));
  if (dependencies.projects) app.use('/api/v1', createProjectRouter(dependencies.projects));
  if (dependencies.properties) app.use('/api/v1', createPropertyRouter(dependencies.properties));
  if (dependencies.propertyMedia) app.use('/api/v1', createPropertyMediaRouter(dependencies.propertyMedia));
  if (dependencies.moderation) app.use('/api/v1', createModerationRouter(dependencies.moderation));
  if (dependencies.publicHomepage) app.use('/api/v1', createPublicRouter(dependencies.publicHomepage));
  if (dependencies.publicSearch) app.use('/api/v1', createPublicSearchRouter(dependencies.publicSearch));
  if (dependencies.publicCompare) app.use('/api/v1', createPublicCompareRouter(dependencies.publicCompare));
  if (dependencies.publicOrganizations) app.use('/api/v1', createPublicOrganizationRouter(dependencies.publicOrganizations));
  if (dependencies.favorites) app.use('/api/v1', createFavoriteRouter(dependencies.favorites));
  if (dependencies.notifications) app.use('/api/v1', createNotificationRouter(dependencies.notifications));
  if (dependencies.settings) app.use('/api/v1', createSettingsRouter(dependencies.settings));
  if (dependencies.requests) app.use('/api/v1', createRequestRouter(dependencies.requests));
  if (dependencies.viewings) app.use('/api/v1', createViewingRouter(dependencies.viewings));
  if (dependencies.articles) app.use('/api/v1', createArticleRouter(dependencies.articles));
  if (dependencies.community) app.use('/api/v1', createCommunityRouter(dependencies.community));
  if (dependencies.publicAboutTeam) app.use('/api/v1', createPublicAboutTeamRouter(dependencies.publicAboutTeam));
  if (dependencies.cmsAdminContent) app.use('/api/v1', createCmsAdminContentRouter(dependencies.cmsAdminContent));
  if (dependencies.adminOverview) app.use('/api/v1', createAdminOverviewRouter(dependencies.adminOverview));
  if (dependencies.administrators) app.use('/api/v1', createAdministratorRouter(dependencies.administrators));
  if (dependencies.advertisingLedger) app.use('/api/v1', createAdvertisingLedgerRouter(dependencies.advertisingLedger));
  if (dependencies.commissionPolicies) app.use('/api/v1', createCommissionPolicyRouter(dependencies.commissionPolicies));
  if (dependencies.commissionAccounts) app.use('/api/v1', createCommissionAccountRouter(dependencies.commissionAccounts));
  if (dependencies.commissionExceptions) app.use('/api/v1', createCommissionExceptionRouter(dependencies.commissionExceptions));
  if (dependencies.commissionConfirmations) app.use('/api/v1', createCommissionConfirmationRouter(dependencies.commissionConfirmations));
  if (dependencies.commissionChangeLog) app.use('/api/v1', createCommissionChangeLogRouter(dependencies.commissionChangeLog));
  app.use(createSecurityErrorHandler());
  return app;
}
