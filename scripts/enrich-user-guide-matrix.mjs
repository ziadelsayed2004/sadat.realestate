import { readFile, writeFile } from "node:fs/promises";
import { reviewedJourneyGuarantees } from "./journey-guarantee-evidence.mjs";

const guideSourcePath = "docs/quality/client-user-guide.ar.json";
const matrixPath = "docs/quality/figma_parity/USER_GUIDE_CONFORMANCE_MATRIX.json";
const routeMatrixPath = "docs/quality/figma_parity/SCREEN_ROUTE_API_JOURNEY_MATRIX.json";

const [guide, matrix, routeMatrix, communityEvidence, adminRequestsEvidence, privacySecurityEvidence, guide04Evidence, providerRegistrationEvidence, seekerAccountEvidence, propertyLifecycleEvidence, remainingSurfacesEvidence, discoveryEvidence, requestGuaranteesEvidence] = await Promise.all([
  readFile(guideSourcePath, "utf8").then(JSON.parse),
  readFile(matrixPath, "utf8").then(JSON.parse),
  readFile(routeMatrixPath, "utf8").then(JSON.parse),
  readFile("docs/quality/guide-runs/community-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/admin-requests-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/privacy-security-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/guide-04-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/provider-registration-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/seeker-account-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/property-lifecycle-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/remaining-surfaces-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/discovery-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
  readFile("docs/quality/guide-runs/request-guarantees-local-latest.json", "utf8").then(JSON.parse).catch(() => null),
]);

const rowsByScreen = new Map(routeMatrix.rows.map((row) => [row.screenId, row]));
const seekerSaveRecovery = await readFile('docs/quality/guide-runs/seeker-save-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerAccountState = await readFile('docs/quality/guide-runs/seeker-account-state-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const sessionRevocation = await readFile('docs/quality/guide-runs/session-revocation-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const sessionBrowser = await readFile('docs/quality/guide-runs/session-browser-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const discoveryValidation = await readFile('docs/quality/guide-runs/discovery-validation-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const discoveryPagination = await readFile('docs/quality/guide-runs/discovery-pagination-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const notificationRecovery = await readFile('docs/quality/guide-runs/notification-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const notificationGuarantees = await readFile('docs/quality/guide-runs/seeker-notifications-guarantees-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityGuarantees = await readFile('docs/quality/guide-runs/community-guarantees-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityBrowserRecovery = await readFile('docs/quality/guide-runs/community-browser-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityPresentation = await readFile('docs/quality/guide-runs/community-presentation-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const requestExport = await readFile('docs/quality/guide-runs/request-export-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityAccountState = await readFile('docs/quality/guide-runs/community-account-state-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerViewingsRecovery = await readFile('docs/quality/guide-runs/seeker-viewings-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerRequestsRecovery = await readFile('docs/quality/guide-runs/seeker-requests-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const adminRequestsRecovery = await readFile('docs/quality/guide-runs/admin-requests-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityPublicRecovery = await readFile('docs/quality/guide-runs/community-public-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const registrationRecovery = await readFile('docs/quality/guide-runs/registration-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const registrationBrowser = await readFile('docs/quality/guide-runs/registration-browser-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const registrationGuarantees = await readFile('docs/quality/guide-runs/registration-guarantees-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const providerRegistrationGuarantees = await readFile('docs/quality/guide-runs/provider-registration-guarantees-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const propertyGuarantees = await readFile('docs/quality/guide-runs/property-guarantees-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const providerPropertiesRecovery = await readFile('docs/quality/guide-runs/provider-properties-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewRecovery = await readFile('docs/quality/guide-runs/seeker-overview-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewCounts = await readFile('docs/quality/guide-runs/seeker-overview-counts-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewCountBrowser = await readFile('docs/quality/guide-runs/seeker-overview-count-browser-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewEmpty = await readFile('docs/quality/guide-runs/seeker-overview-empty-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewProjection = await readFile('docs/quality/guide-runs/seeker-overview-projection-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewNavigation = await readFile('docs/quality/guide-runs/seeker-overview-navigation-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewLogout = await readFile('docs/quality/guide-runs/seeker-overview-logout-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerOverviewAccess = await readFile('docs/quality/guide-runs/seeker-overview-access-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const favoritesAccess = await readFile('docs/quality/guide-runs/favorites-access-http-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const favoritesRemoveRecovery = await readFile('docs/quality/guide-runs/saved-remove-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const favoritesLogout = await readFile('docs/quality/guide-runs/favorites-logout-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const savedEmptyRecovery = await readFile('docs/quality/guide-runs/saved-empty-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const seekerPropertySearch = await readFile('docs/quality/guide-runs/seeker-property-search-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityInteractions = await readFile('docs/quality/guide-runs/community-interactions-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const providerCustomerRequest = await readFile('docs/quality/guide-runs/provider-customer-request-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const providerCustomerRecovery = await readFile('docs/quality/guide-runs/provider-customer-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const providerProjectsRecovery = await readFile('docs/quality/guide-runs/provider-projects-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const providerViewingsRecovery = await readFile('docs/quality/guide-runs/provider-viewings-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const guide03ContentBrowser = await readFile('docs/quality/guide-runs/guide03-content-browser-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const guide22AdminContentBrowser = await readFile('docs/quality/guide-runs/guide22-admin-content-browser-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const guide22ContentMutations = await readFile('docs/quality/guide-runs/guide22-content-mutations-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const journeySource = new Map(guide.journeys.map((journey) => [journey.id, journey]));

function evidenceDate(journey) {
  const dates = [
    journey.executionEvidence?.verifiedAt,
    journey.executionEvidence?.contactJourneyEvidence?.verifiedAt,
    ...(journey.evidenceAttachments ?? []).map((evidence) => evidence.verifiedAt),
  ].filter(Boolean).sort();
  return dates.at(-1) ?? null;
}

function hasExecutedEvidence(journey) {
  return Boolean(journey.executionEvidence?.path || journey.executionEvidence?.paths?.length || journey.backendGuaranteesEvidence?.path || journey.evidenceAttachments?.length);
}

function appendMissingEvidence(generated, existing, identity) {
  const known = new Set(generated.map(identity));
  for (const item of existing ?? []) {
    const key = identity(item);
    if (!known.has(key)) {
      generated.push(item);
      known.add(key);
    }
  }
}

const supplementalRuns = [
  ["docs/quality/guide-runs/admin-requests-recovery-local-latest.json", adminRequestsRecovery],
  ["docs/quality/guide-runs/community-public-recovery-local-latest.json", communityPublicRecovery],
  ["docs/quality/guide-runs/request-export-local-latest.json", requestExport],
  ["docs/quality/guide-runs/community-account-state-local-latest.json", communityAccountState],
  ["docs/quality/guide-runs/community-presentation-local-latest.json", communityPresentation],
  ["docs/quality/guide-runs/admin-requests-local-latest.json", adminRequestsEvidence],
  ["docs/quality/guide-runs/privacy-security-local-latest.json", privacySecurityEvidence],
  ["docs/quality/guide-runs/provider-registration-local-latest.json", providerRegistrationEvidence],
  ["docs/quality/guide-runs/provider-registration-guarantees-local-latest.json", providerRegistrationGuarantees],
  ["docs/quality/guide-runs/property-guarantees-local-latest.json", propertyGuarantees],
  ["docs/quality/guide-runs/provider-properties-recovery-local-latest.json", providerPropertiesRecovery],
  ["docs/quality/guide-runs/seeker-account-local-latest.json", seekerAccountEvidence],
  ["docs/quality/guide-runs/property-lifecycle-local-latest.json", propertyLifecycleEvidence],
  ["docs/quality/guide-runs/remaining-surfaces-local-latest.json", remainingSurfacesEvidence],
  ["docs/quality/guide-runs/discovery-local-latest.json", discoveryEvidence],
  ["docs/quality/guide-runs/discovery-pagination-local-latest.json", discoveryPagination],
  ["docs/quality/guide-runs/registration-recovery-local-latest.json", registrationRecovery],
  ["docs/quality/guide-runs/registration-browser-local-latest.json", registrationBrowser],
  ["docs/quality/guide-runs/registration-guarantees-local-latest.json", registrationGuarantees],
  ["docs/quality/guide-runs/seeker-overview-recovery-local-latest.json", seekerOverviewRecovery],
  ["docs/quality/guide-runs/seeker-overview-count-browser-local-latest.json", seekerOverviewCountBrowser],
  ["docs/quality/guide-runs/seeker-overview-empty-local-latest.json", seekerOverviewEmpty],
  ["docs/quality/guide-runs/seeker-overview-navigation-local-latest.json", seekerOverviewNavigation],
  ["docs/quality/guide-runs/seeker-overview-logout-local-latest.json", seekerOverviewLogout],
  ["docs/quality/guide-runs/seeker-overview-access-local-latest.json", seekerOverviewAccess],
  ["docs/quality/guide-runs/saved-empty-local-latest.json", savedEmptyRecovery],
  ["docs/quality/guide-runs/provider-customer-recovery-local-latest.json", providerCustomerRecovery],
  ["docs/quality/guide-runs/provider-projects-recovery-local-latest.json", providerProjectsRecovery],
  ["docs/quality/guide-runs/provider-viewings-recovery-local-latest.json", providerViewingsRecovery],
  ["docs/quality/guide-runs/notification-recovery-local-latest.json", notificationRecovery],
  ["docs/quality/guide-runs/seeker-notifications-guarantees-local-latest.json", notificationGuarantees],
  ["docs/quality/guide-runs/guide03-content-browser-local-latest.json", guide03ContentBrowser],
  ["docs/quality/guide-runs/guide22-admin-content-browser-local-latest.json", guide22AdminContentBrowser],
  ["docs/quality/guide-runs/guide22-content-mutations-local-latest.json", guide22ContentMutations],
].filter(([, evidence]) => evidence?.status?.startsWith("PASS_LOCAL"));

const guide03LocalAcceptanceReady = guide03ContentBrowser?.status === 'PASS_LOCAL'
  && guide03ContentBrowser.mockedRoutes === false
  && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
    guide03ContentBrowser.runs?.some(run => run.locale === locale && run.device === device
      && run.status === 'PASS' && run.consoleErrors === 0 && run.screens?.length === 4
      && run.screens.every(screen => screen.documentStatus === 200 && screen.scrollWidth === screen.innerWidth))))
  && communityPresentation?.status === 'PASS_LOCAL_SUBCASES' && communityPresentation.mockedRoutes === false
  && communityPublicRecovery?.status === 'PASS_LOCAL_SUBCASES' && communityPublicRecovery.mockedRoutes === false
  && communityPublicRecovery.cleanup === true
  && communityInteractions?.status === 'PASS_LOCAL' && communityInteractions.mockedRoutes === false
  && communityInteractions.cleanup === true && communityInteractions.checks?.length === 4
  && communityEvidence?.status === 'PASS_LOCAL' && communityGuarantees?.status === 'PASS_LOCAL';

const guide04LocalAcceptanceReady = registrationBrowser?.status === 'PASS_LOCAL'
  && registrationBrowser.mockedRoutes === false && registrationBrowser.cleanup === true
  && registrationBrowser.authorizationStatus === 403
  && registrationBrowser.logoutStatuses?.logout === 200
  && registrationBrowser.logoutStatuses?.refreshAfterLogout === 401
  && registrationBrowser.width?.innerWidth === registrationBrowser.width?.scrollWidth
  && registrationRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && registrationRecovery.mockedRoutes === false && registrationRecovery.otpChallengesRemoved === true
  && registrationRecovery.runs?.length === 6
  && registrationGuarantees?.status === 'PASS_LOCAL'
  && registrationGuarantees.mockedRoutes === false && registrationGuarantees.cleanup === true
  && registrationGuarantees.checks?.length === 5
  && registrationGuarantees.mongo?.duplicateGrantRestored === true
  && registrationGuarantees.mongo?.failedRegistrationResidue === 0;

const guide05LocalAcceptanceReady = seekerOverviewRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && seekerOverviewRecovery.mockedRoutes === false && seekerOverviewRecovery.sessionsRemoved === true
  && seekerOverviewCounts?.status === 'PASS_LOCAL' && seekerOverviewCounts.cleanup === true
  && seekerOverviewCountBrowser?.status === 'PASS_LOCAL_SUBCASES'
  && seekerOverviewCountBrowser.mockedRoutes === false && seekerOverviewCountBrowser.sessionsRemoved === true
  && seekerOverviewCountBrowser.fixturesRemoved === true
  && seekerOverviewEmpty?.status === 'PASS_LOCAL_SUBCASES'
  && seekerOverviewEmpty.mockedRoutes === false && seekerOverviewEmpty.sessionsRemoved === true
  && seekerOverviewProjection?.status === 'PASS_LOCAL' && seekerOverviewProjection.cleanup === true
  && seekerOverviewNavigation?.status === 'PASS_LOCAL_SUBCASES'
  && seekerOverviewNavigation.mockedRoutes === false && seekerOverviewNavigation.sessionsRemoved === true
  && seekerOverviewNavigation.temporaryViewingRemoved === true && seekerOverviewNavigation.temporaryNotificationRemoved === true
  && seekerOverviewLogout?.status === 'PASS_LOCAL_SUBCASES'
  && seekerOverviewLogout.mockedRoutes === false && seekerOverviewLogout.sessionsRemoved === true
  && seekerOverviewAccess?.status === 'PASS_LOCAL' && seekerOverviewAccess.mockedRoutes === false
  && seekerOverviewAccess.cleanup === true
  && [seekerOverviewRecovery, seekerOverviewCountBrowser, seekerOverviewEmpty, seekerOverviewNavigation, seekerOverviewLogout]
    .every(evidence => ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
      evidence.runs?.some(run => run.locale === locale && run.device === device
        && (run.scrollWidth === undefined || run.scrollWidth <= run.innerWidth)))));

const discoveryLocalAcceptanceReady = discoveryEvidence?.status === 'PASS_LOCAL'
  && discoveryEvidence.mockedRoutes === false && discoveryEvidence.cleanup === true
  && discoveryEvidence.runs?.length === 6
  && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
    discoveryEvidence.runs.some(run => run.locale === locale && run.device === device
      && run.status === 'PASS' && run.pageErrors === 0 && run.scrollWidth <= run.innerWidth
      && ['homepage_search_to_listing', 'filter_updates_results', 'offline_filter_retry_recovers_without_navigation',
        'empty_results_reset_without_navigation', 'two_properties_selected_for_comparison', 'published_property_detail',
        'developer_directory_to_public_profile'].every(check => run.checks?.includes(check)))))
  && discoveryValidation?.status === 'PASS_LOCAL_API_SUBCASES'
  && discoveryValidation.mockedRoutes === false && discoveryValidation.checks?.length === 7
  && discoveryValidation.checks.every(check => check.status === 400)
  && discoveryValidation.validQueryAfterRejections === 200
  && discoveryPagination?.status === 'PASS_LOCAL_SUBCASES' && discoveryPagination.mockedRoutes === false
  && discoveryPagination.runs?.length === 6;

const guide02LocalAcceptanceReady = discoveryLocalAcceptanceReady
  && guide04Evidence?.status === 'PASS_LOCAL'
  && guide04Evidence.relatedJourneyEvidence?.status === 'PASS_LOCAL_FAVORITES'
  && favoritesAccess?.status === 'PASS_LOCAL' && favoritesAccess.mockedRoutes === false && favoritesAccess.cleanup === true
  && favoritesRemoveRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && favoritesRemoveRecovery.mockedRoutes === false && favoritesRemoveRecovery.sessionsRemoved === true
  && favoritesRemoveRecovery.fixturesRemoved === true
  && favoritesLogout?.status === 'PASS_LOCAL_SUBCASES'
  && favoritesLogout.mockedRoutes === false && favoritesLogout.sessionsRemoved === true;

const guide09LocalAcceptanceReady = notificationRecovery?.status === 'PASS_LOCAL'
  && notificationRecovery.mockedRoutes === false && notificationRecovery.cleanup === true
  && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(profile =>
    notificationRecovery.runs?.some(run => run.locale === locale && run.profile === profile
      && run.status === 'PASS' && run.width?.scrollWidth === run.width?.innerWidth)))
  && notificationGuarantees?.status === 'PASS_LOCAL'
  && notificationGuarantees.mockedRoutes === false && notificationGuarantees.cleanup === true
  && notificationGuarantees.checks?.safeOrderedProjection?.internalFieldsLeaked === false
  && notificationGuarantees.checks?.idempotentRead?.readAtStable === true
  && notificationGuarantees.checks?.concurrentDuplicate?.singleStableReadAt === true
  && notificationGuarantees.checks?.authorization?.foreignUnchanged === true
  && notificationGuarantees.checks?.readAllAndEmpty?.emptyState === true
  && notificationGuarantees.checks?.currentState?.notificationsUnchanged === true;

const providerRegistrationLocalAcceptanceReady = providerRegistrationEvidence?.status === 'PASS_LOCAL'
  && providerRegistrationEvidence.mockedRoutes === false && providerRegistrationEvidence.cleanup === true
  && providerRegistrationEvidence.mongo?.atomicStateCoherence === true
  && providerRegistrationEvidence.mongo?.activeDocumentCount === 4
  && ['provider.needs_information', 'provider.verify'].every(action => providerRegistrationEvidence.mongo?.auditActions?.includes(action))
  && ['draft_provider_denied_admin_projection_403', 'limited_admin_provider_review_denied_403',
    'admin_review_reason_required_in_browser', 'repeated_stale_review_rejected_409',
    'provider_sessions_revoked_after_each_admin_decision', 'provider_reauthentication_reflects_authoritative_status']
    .every(check => providerRegistrationEvidence.authorization?.includes(check))
  && [
    ['draft_ready', 4], ['pending_review_responsive', 1],
    ['needs_information_responsive', 1], ['approved_responsive', 1]
  ].every(([stage, routeCount]) => ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
    providerRegistrationEvidence.browser?.some(run => run.stage === stage && run.locale === locale && run.device === device
      && run.status === 'PASS' && run.pageErrors === 0 && run.routeChecks?.length === routeCount
      && run.routeChecks.every(route => route.documentStatus === 200 && route.scrollWidth <= route.innerWidth + 1)))))
  && providerRegistrationGuarantees?.status === 'PASS_LOCAL'
  && providerRegistrationGuarantees.mockedRoutes === false && providerRegistrationGuarantees.cleanup === true
  && providerRegistrationGuarantees.checks?.length === 4
  && providerRegistrationGuarantees.mongo?.failedRegistrationResidue === 0
  && providerRegistrationGuarantees.mongo?.duplicateGrantRestored === true;

const propertyLifecycleLocalAcceptanceReady = propertyLifecycleEvidence?.status === 'PASS_LOCAL'
  && propertyLifecycleEvidence.mockedRoutes === false && propertyLifecycleEvidence.cleanup === true
  && ['stale_provider_update_rejected_409', 'view_only_admin_review_denied_403',
    'anonymous_and_admin_denied_provider_property_route', 'foreign_provider_property_hidden_404',
    'current_suspended_provider_token_rejected_401_and_restored']
    .every(check => propertyLifecycleEvidence.authorization?.includes(check))
  && [
    ['incomplete_review_responsive', 1], ['draft_complete_responsive', 10],
    ['submitted_responsive', 1], ['needs_changes_responsive', 1],
    ['published_responsive', 1], ['rejected_responsive', 1]
  ].every(([stage, routeCount]) => ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
    propertyLifecycleEvidence.browser?.some(run => run.stage === stage && run.locale === locale && run.device === device
      && run.status === 'PASS' && run.pageErrors === 0 && run.routeChecks?.length === routeCount
      && run.routeChecks.every(route => route.documentStatus === 200 && route.scrollWidth <= route.innerWidth + 1)))))
  && ['property.create', 'property.update', 'property.submit', 'property.review', 'property.visibility']
    .every(action => propertyLifecycleEvidence.mongo?.auditActions?.includes(action))
  && propertyGuarantees?.status === 'PASS_LOCAL' && propertyGuarantees.mockedRoutes === false
  && propertyGuarantees.cleanup === true && propertyGuarantees.checks?.length === 2
  && propertyGuarantees.mongo?.failedReviewStatus === 'pending_review'
  && propertyGuarantees.mongo?.failedReviewVersion === 0
  && propertyGuarantees.mongo?.failedReviewAuditCount === 0
  && providerPropertiesRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && providerPropertiesRecovery.mockedRoutes === false && providerPropertiesRecovery.cleanup === true
  && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
    providerPropertiesRecovery.runs?.some(run => run.locale === locale && run.device === device
      && run.status === 'PASS' && run.httpStatuses?.empty === 200 && run.httpStatuses?.recovered === 200
      && run.scrollWidth <= run.innerWidth)));

const guide16LocalAcceptanceReady = providerCustomerRequest?.status === 'PASS_LOCAL'
  && providerCustomerRequest.mockedRoutes === false && providerCustomerRequest.cleanup === true
  && providerCustomerRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && providerCustomerRecovery.mockedRoutes === false && providerCustomerRecovery.cleanup === true
  && providerCustomerRecovery.temporaryRequestRemoved === true
  && providerProjectsRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && providerProjectsRecovery.mockedRoutes === false && providerProjectsRecovery.cleanup === true
  && providerProjectsRecovery.temporaryProjectsRemoved === true
  && providerViewingsRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && providerViewingsRecovery.mockedRoutes === false && providerViewingsRecovery.cleanup === true
  && providerViewingsRecovery.viewingsUnchanged === true
  && ['provider_browser_confirm_200', 'provider_browser_reschedule_200', 'provider_browser_complete_200',
    'provider_browser_cancel_requires_reason', 'provider_browser_cancel_200'].every(check =>
    guide04Evidence?.viewingJourneyEvidence?.checks?.includes(check))
  && [providerCustomerRecovery, providerProjectsRecovery, providerViewingsRecovery].every(evidence =>
    ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
      evidence.runs?.some(run => run.locale === locale && run.device === device && run.scrollWidth <= run.innerWidth))));

const guide21LocalAcceptanceReady = adminRequestsRecovery?.status === 'PASS_LOCAL_SUBCASES'
  && adminRequestsRecovery.mockedRoutes === false && adminRequestsRecovery.cleanup === true
  && adminRequestsRecovery.temporaryRequestRemoved === true
  && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
    adminRequestsRecovery.runs?.some(run => run.locale === locale && run.device === device
      && run.routeChecks?.length === 6
      && run.routeChecks.every(route => route.httpStatus === 200 && route.scrollWidth <= route.innerWidth)
      && ['six_admin_request_routes_real_api', 'empty_search_clear_recovers_without_navigation',
        'offline_filter_retry_recovers_without_navigation', 'invalid_transition_reason_blocks_mutation']
        .every(check => run.checks?.includes(check))
      && run.transitionRequests === 0 && run.requestUnchanged === true && run.auditWrites === 0
      && run.documentReloaded === false && run.scrollWidth <= run.innerWidth)))
  && ['ar', 'en'].every(locale => adminRequestsRecovery.limitedAdmin?.some(run =>
    run.locale === locale && run.routeChecks?.length === 6
      && run.routeChecks.every(route => [200, 403].includes(route.httpStatus))
      && run.directMutationStatuses?.length === 3
      && run.directMutationStatuses.every(status => status === 403)
      && run.mutationControlsHidden === true && run.requestUnchanged === true && run.auditWrites === 0))
  && requestGuaranteesEvidence?.status === 'PASS_LOCAL'
  && requestGuaranteesEvidence.mockedRoutes === false;

const guide22LocalAcceptanceReady = guide22AdminContentBrowser?.status === 'PASS_LOCAL'
  && guide22AdminContentBrowser.mockedRoutes === false && guide22AdminContentBrowser.cleanup === true
  && guide22AdminContentBrowser.runs?.length === 6
  && guide22AdminContentBrowser.runs.every(run => run.status === 'PASS' && run.pageErrors === 0
    && run.screens?.length === 8 && run.screens.every(screen => screen.documentStatus === 200
      && screen.apiStatuses?.every(status => status === 200) && screen.scrollWidth === screen.innerWidth))
  && guide22ContentMutations?.status === 'PASS_LOCAL' && guide22ContentMutations.mockedRoutes === false
  && guide22ContentMutations.cleanup === true && guide22ContentMutations.populationRestored === true
  && guide22ContentMutations.checks?.length === 6
  && guide22ContentMutations.atomicAuditRollback?.articleMutationRolledBack === true
  && guide22ContentMutations.atomicAuditRollback?.cmsMutationRolledBack === true
  && communityEvidence?.status === 'PASS_LOCAL' && communityGuarantees?.status === 'PASS_LOCAL'
  && communityBrowserRecovery?.status === 'PASS_LOCAL_SUBCASES' && communityBrowserRecovery.mockedRoutes === false;

matrix.schemaVersion = 2;
matrix.generatedAt = new Date().toISOString();
matrix.status = "PARTIAL_LOCAL_EXECUTION_PENDING_COMPLETE_E2E_AND_PRODUCTION";
matrix.contract = {
  allowedStatuses: ["VERIFIED", "PARTIAL", "BLOCKED"],
  verifiedMeaning: "A real browser, API and MongoDB journey passed in the declared environment with reviewable evidence.",
  partialMeaning: "Mapping or only a subset of the required browser/API/database journey is evidenced.",
  blockedMeaning: "Execution cannot proceed because a named external prerequisite is unavailable.",
  mocksAreCompletionEvidence: false,
};
matrix.journeys = matrix.journeys.map((journey) => {
  const source = journeySource.get(journey.id);
  if (!source) throw new Error(`Missing structured guide source for ${journey.id}`);
  const communityRunApplies = communityEvidence?.status === "PASS_LOCAL" && communityEvidence.journeys?.includes(journey.id);
  const evidenceAttachments = supplementalRuns.flatMap(([path, evidence]) => evidence.journeys?.includes(journey.id) ? [{
    path,
    status: evidence.status,
    verifiedAt: evidence.finishedAt,
    environment: evidence.environment,
    mockedRoutes: evidence.mockedRoutes,
    remaining: evidence.remaining,
  }] : []);
  if (guide04Evidence?.status === "PASS_LOCAL") {
    const scopedGuide04Evidence = {
      "GUIDE-02": guide04Evidence.relatedJourneyEvidence?.status === "PASS_LOCAL_FAVORITES" ? guide04Evidence.relatedJourneyEvidence : null,
      "GUIDE-04": {
        status: guide04Evidence.status,
        checks: guide04Evidence.transitions ?? [],
      },
      "GUIDE-05": guide04Evidence.transitions?.includes("authenticated_dashboard_after_full_navigation") ? {
        status: "PASS_LOCAL_DASHBOARD_ENTRY",
        checks: ["authenticated_dashboard_after_full_navigation", "mobile_width_without_overflow"],
      } : null,
      "GUIDE-06": guide04Evidence.contactJourneyEvidence?.status === "PASS_LOCAL_CONTACT_PARTIAL_GUIDES" ? guide04Evidence.contactJourneyEvidence : null,
      "GUIDE-07": guide04Evidence.viewingJourneyEvidence?.status === "PASS_LOCAL_VIEWING_PARTIAL_GUIDE" ? guide04Evidence.viewingJourneyEvidence : null,
      "GUIDE-08": guide04Evidence.relatedJourneyEvidence?.status === "PASS_LOCAL_FAVORITES" ? guide04Evidence.relatedJourneyEvidence : null,
      "GUIDE-16": guide04Evidence.viewingJourneyEvidence?.status === "PASS_LOCAL_VIEWING_PARTIAL_GUIDE" ? {
        status: 'PASS_LOCAL_PROVIDER_VIEWING_SUBFLOW',
        checks: guide04Evidence.viewingJourneyEvidence.checks.filter(check => check.startsWith('provider_browser_')),
        remaining: ['Production verification'],
      } : null,
    }[journey.id];
    if (scopedGuide04Evidence) evidenceAttachments.push({
      path: "docs/quality/guide-runs/guide-04-local-latest.json",
      status: scopedGuide04Evidence.status,
      verifiedAt: guide04Evidence.finishedAt,
      environment: guide04Evidence.environment,
      mockedRoutes: guide04Evidence.mockedRoutes,
      scope: scopedGuide04Evidence,
    });
  }
  if (journey.id === 'GUIDE-02' && guide02LocalAcceptanceReady) {
    for (const [path, evidence] of [
      ['docs/quality/guide-runs/favorites-access-http-local-latest.json', favoritesAccess],
      ['docs/quality/guide-runs/saved-remove-recovery-local-latest.json', favoritesRemoveRecovery],
      ['docs/quality/guide-runs/favorites-logout-local-latest.json', favoritesLogout],
    ]) evidenceAttachments.push({ path, status: evidence.status, verifiedAt: evidence.finishedAt,
      environment: evidence.environment, mockedRoutes: evidence.mockedRoutes });
  }
  if (["GUIDE-06", "GUIDE-07", "GUIDE-21"].includes(journey.id) && requestGuaranteesEvidence?.status === "PASS_LOCAL") {
    evidenceAttachments.push({
      path: "docs/quality/guide-runs/request-guarantees-local-latest.json",
      status: requestGuaranteesEvidence.status,
      verifiedAt: requestGuaranteesEvidence.testedAt,
      environment: requestGuaranteesEvidence.environment,
      mockedRoutes: false,
      checks: requestGuaranteesEvidence.checks,
    });
  }
  if (journey.id === 'GUIDE-03' && communityInteractions?.status === 'PASS_LOCAL'
    && communityInteractions.mockedRoutes === false && communityInteractions.cleanup === true) {
    evidenceAttachments.push({
      path: 'docs/quality/guide-runs/community-interactions-local-latest.json',
      status: communityInteractions.status,
      verifiedAt: communityInteractions.finishedAt,
      environment: communityInteractions.environment,
      mockedRoutes: false,
      checks: communityInteractions.checks,
    });
  }
  if (journey.id === 'GUIDE-06' && seekerPropertySearch?.status === 'PASS_LOCAL'
    && seekerPropertySearch.mockedRoutes === false && seekerPropertySearch.cleanup === true) {
    evidenceAttachments.push({
      path: 'docs/quality/guide-runs/seeker-property-search-local-latest.json',
      status: seekerPropertySearch.status,
      verifiedAt: seekerPropertySearch.finishedAt,
      environment: seekerPropertySearch.environment,
      mockedRoutes: false,
      checks: seekerPropertySearch.checks,
    });
  }
  if (journey.id === 'GUIDE-16' && providerCustomerRequest?.status === 'PASS_LOCAL'
    && providerCustomerRequest.mockedRoutes === false && providerCustomerRequest.cleanup === true) {
    evidenceAttachments.push({
      path: 'docs/quality/guide-runs/provider-customer-request-local-latest.json',
      status: providerCustomerRequest.status,
      verifiedAt: providerCustomerRequest.finishedAt,
      environment: providerCustomerRequest.environment,
      mockedRoutes: false,
      checks: providerCustomerRequest.checks,
    });
  }
  if (journey.id === 'GUIDE-10') {
    for (const [path, evidence] of [
      ['docs/quality/guide-runs/seeker-account-state-local-latest.json', seekerAccountState],
      ['docs/quality/guide-runs/session-revocation-local-latest.json', sessionRevocation],
    ]) if (evidence?.status === 'PASS_LOCAL' && evidence.mockedRoutes === false && evidence.cleanup === true) {
      evidenceAttachments.push({ path, status: evidence.status, verifiedAt: evidence.finishedAt,
        environment: evidence.environment, mockedRoutes: false });
    }
  }
  appendMissingEvidence(evidenceAttachments, journey.evidenceAttachments, item => item.path);
  const executionEvidence = communityRunApplies ? {
    path: "docs/quality/guide-runs/community-local-latest.json",
    status: communityEvidence.status,
    verifiedAt: communityEvidence.finishedAt,
    environment: communityEvidence.environment,
    mockedRoutes: communityEvidence.mockedRoutes,
    transitions: communityEvidence.transitions,
    authorization: communityEvidence.authorization,
    mongo: communityEvidence.mongo,
    remaining: communityEvidence.remaining,
  } : journey.executionEvidence;
  const hydratedJourney = { ...journey, ...(executionEvidence === undefined ? {} : { executionEvidence }), ...(evidenceAttachments.length === 0 ? {} : { evidenceAttachments }) };
  if (journey.id === 'GUIDE-03' && guide03LocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_03_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
  }
  if (journey.id === 'GUIDE-04' && guide04LocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_04_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.applicabilityReview = {
      horizontalAccess: 'NOT_APPLICABLE',
      expectedVersion409: 'NOT_APPLICABLE',
      decisionReason: 'NOT_APPLICABLE',
      atomicAuditRollback: 'NOT_APPLICABLE',
      rationale: 'Registration creates a new self account from a one-time grant bound to one email and role; there is no pre-existing owned object, approval/version transition, or administrative audit mutation. Cross-collection registration rollback is reviewed separately.',
    };
  }
  if (['GUIDE-11', 'GUIDE-12', 'GUIDE-13'].includes(journey.id) && providerRegistrationLocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_11_12_13_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.applicabilityReview = {
      horizontalAccess: 'NOT_APPLICABLE',
      rationale: 'Provider draft routes are self-scoped from the current provider session; administrative review uses a global provider application identifier protected by the provider-review permission and current account/session guards.',
    };
  }
  if (['GUIDE-14', 'GUIDE-15'].includes(journey.id) && propertyLifecycleLocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_14_15_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
  }
  if (journey.id === 'GUIDE-05' && guide05LocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_05_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.applicabilityReview = {
      duplicateMutation: 'NOT_APPLICABLE',
      validation: 'NOT_APPLICABLE',
      expectedVersion409: 'NOT_APPLICABLE',
      decisionReason: 'NOT_APPLICABLE',
      atomicAuditRollback: 'NOT_APPLICABLE',
      rationale: 'The seeker overview is an owned read-only aggregate. It has no mutation, decision reason, optimistic-write version, or audit write contract.',
    };
  }
  if (journey.id === 'GUIDE-01' && discoveryLocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_01_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.applicabilityReview = {
      duplicateMutation: 'NOT_APPLICABLE', horizontalAccess: 'NOT_APPLICABLE',
      currentSessionState: 'NOT_APPLICABLE', roleAuthorization: 'NOT_APPLICABLE',
      expectedVersion409: 'NOT_APPLICABLE', decisionReason: 'NOT_APPLICABLE', atomicAuditRollback: 'NOT_APPLICABLE',
      rationale: 'Public discovery reads are intentionally anonymous and do not mutate owned or versioned records.',
    };
  }
  if (journey.id === 'GUIDE-02' && guide02LocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_02_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.applicabilityReview = {
      expectedVersion409: 'NOT_APPLICABLE', decisionReason: 'NOT_APPLICABLE', atomicAuditRollback: 'NOT_APPLICABLE',
      rationale: 'Public property discovery and comparison are reads; saving is an idempotent seeker-owned set operation without a versioned workflow or audit mutation.',
    };
  }
  if (journey.id === 'GUIDE-22') {
    hydratedJourney.applicabilityReview = {
      ...(hydratedJourney.applicabilityReview ?? {}),
      horizontalAccess: 'NOT_APPLICABLE',
      rationale: 'These global CMS and moderation records are governed by admin permissions and have no recipient, owner, or tenant scope.',
    };
    if (guide22LocalAcceptanceReady) hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_22_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
  }
  if (journey.id === 'GUIDE-09' && guide09LocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_09_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.applicabilityReview = {
      expectedVersion409: 'NOT_APPLICABLE',
      decisionReason: 'NOT_APPLICABLE',
      atomicAuditRollback: 'NOT_APPLICABLE',
      rationale: 'Recipient-owned notification read markers are idempotent state flags without an approval workflow or optimistic-version contract.',
    };
  }
  if (journey.id === 'GUIDE-10') {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_10_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.applicabilityReview = {
      expectedVersion409: 'NOT_APPLICABLE',
      decisionReason: 'NOT_APPLICABLE',
      rationale: 'Profile and preference PATCH operations are idempotent self-service field updates without a versioned workflow decision contract; session revocation uses a server-managed audit reason.',
    };
  }
  if (journey.id === 'GUIDE-16' && guide16LocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_16_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
    hydratedJourney.accountSubtypeReview = {
      status: 'SHARED_PROVIDER_ROLE_CONTRACT',
      accountTypes: ['individual_provider', 'broker', 'developer_company'],
      rationale: 'All three guide audiences authenticate and authorize these four routes through the same provider role contract; no subtype branch exists in the route or service implementation.',
    };
  }
  if (journey.id === 'GUIDE-21' && guide21LocalAcceptanceReady) {
    hydratedJourney.localAcceptanceReview = {
      status: 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED',
      path: 'docs/quality/GUIDE_21_LOCAL_ACCEPTANCE_2026-09-12.md',
      reviewedAt: '2026-09-12',
    };
  }
  if (journey.id === 'GUIDE-10') hydratedJourney.browserContractRegression = {
    path: 'docs/quality/guide-runs/seeker-profile-save-recovery-2026-09-11.json',
    mockedRoutes: true, scope: 'Save draft preservation and permission failure on six device/locale projects; does not establish live journey closure',
  };
  const routeRows = journey.screenIds.map((screenId) => rowsByScreen.get(screenId)).filter(Boolean);
  const legacyStatus = journey.verificationStatus;
  const executed = hasExecutedEvidence(hydratedJourney);
  const reviewedGuarantees = reviewedJourneyGuarantees(journey.id, {
    requests: requestGuaranteesEvidence, community: communityEvidence, communityGuarantees,
    privacy: privacySecurityEvidence, seeker: seekerAccountEvidence,
  });
  const guaranteeStatus = category => reviewedGuarantees.some(item => item.category === category)
    ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED";
  if (journey.id === 'GUIDE-22' && communityEvidence?.status === 'PASS_LOCAL'
    && communityEvidence.transitions?.includes('concurrent_hide_one_200_one_409_v2')) {
    reviewedGuarantees.push({ category: 'duplicateMutation', check: 'concurrent_hide_one_200_one_409_v2',
      path: 'docs/quality/guide-runs/community-local-latest.json', verifiedAt: communityEvidence.finishedAt });
  }
  if (journey.id === 'GUIDE-22' && guide22ContentMutations?.status === 'PASS_LOCAL'
    && guide22ContentMutations.mockedRoutes === false && guide22ContentMutations.cleanup === true) {
    for (const [category, check] of [
      ['roleAuthorization', 'authentication_401_and_limited_admin_403'],
      ['currentSessionState', 'current_admin_account_state_enforced'],
      ['expectedVersion409', 'article_category_and_cms_concurrent_versions'],
      ['duplicateMutation', 'category_report_and_concurrent_mutation_duplicates'],
      ['decisionReason', 'article_cms_and_report_reason_validation'],
      ['atomicAuditRollback', 'article_cms_and_report_audit_failure_roll_back_mutations'],
    ]) reviewedGuarantees.push({ category, check,
      path: 'docs/quality/guide-runs/guide22-content-mutations-local-latest.json',
      verifiedAt: guide22ContentMutations.finishedAt });
  }
  if (journey.id === 'GUIDE-04' && guide04LocalAcceptanceReady) {
    for (const [category, check, path, verifiedAt] of [
      ['roleAuthorization', 'seeker_role_denied_admin_api', 'docs/quality/guide-runs/registration-browser-local-latest.json', registrationBrowser.finishedAt],
      ['currentSessionState', 'logout_invalidates_refresh_session', 'docs/quality/guide-runs/registration-browser-local-latest.json', registrationBrowser.finishedAt],
      ['duplicateMutation', 'grant_replay_and_duplicate_email_rejected_without_duplicate_account', 'docs/quality/guide-runs/registration-guarantees-local-latest.json', registrationGuarantees.finishedAt],
      ['atomicRegistrationRollback', 'credential_failure_rolls_back_grant_user_and_profile', 'docs/quality/guide-runs/registration-guarantees-local-latest.json', registrationGuarantees.finishedAt],
    ]) reviewedGuarantees.push({ category, check, path, verifiedAt });
  }
  if (['GUIDE-11', 'GUIDE-12', 'GUIDE-13'].includes(journey.id) && providerRegistrationLocalAcceptanceReady) {
    for (const [category, check, path, verifiedAt] of [
      ['roleAuthorization', 'draft_provider_and_limited_admin_forbidden_from_admin_review_capabilities', 'docs/quality/guide-runs/provider-registration-local-latest.json', providerRegistrationEvidence.finishedAt],
      ['currentSessionState', 'review_decisions_revoke_provider_sessions_and_reauthentication_reads_authoritative_state', 'docs/quality/guide-runs/provider-registration-local-latest.json', providerRegistrationEvidence.finishedAt],
      ['duplicateMutation', 'document_replay_is_idempotent_and_registration_grant_replay_is_rejected', 'docs/quality/guide-runs/provider-registration-guarantees-local-latest.json', providerRegistrationGuarantees.finishedAt],
      ['expectedVersion409', 'incomplete_submit_and_repeated_stale_review_are_rejected_with_409', 'docs/quality/guide-runs/provider-registration-local-latest.json', providerRegistrationEvidence.finishedAt],
      ['decisionReason', 'review_reason_is_required_and_persisted_with_both_review_audits', 'docs/quality/guide-runs/provider-registration-local-latest.json', providerRegistrationEvidence.finishedAt],
      ['atomicRegistrationRollback', 'credential_failure_rolls_back_grant_user_profile_application_credential_and_session', 'docs/quality/guide-runs/provider-registration-guarantees-local-latest.json', providerRegistrationGuarantees.finishedAt],
    ]) reviewedGuarantees.push({ category, check, path, verifiedAt });
  }
  if (['GUIDE-14', 'GUIDE-15'].includes(journey.id) && propertyLifecycleLocalAcceptanceReady) {
    for (const [category, check, path, verifiedAt] of [
      ['horizontalAccess', 'foreign_provider_property_hidden_404', 'docs/quality/guide-runs/property-lifecycle-local-latest.json', propertyLifecycleEvidence.finishedAt],
      ['roleAuthorization', 'anonymous_admin_and_limited_admin_property_capabilities_denied', 'docs/quality/guide-runs/property-lifecycle-local-latest.json', propertyLifecycleEvidence.finishedAt],
      ['currentSessionState', 'current_suspended_provider_token_rejected_401_and_restored', 'docs/quality/guide-runs/property-lifecycle-local-latest.json', propertyLifecycleEvidence.finishedAt],
      ['duplicateMutation', 'duplicate_submit_rejected_422_without_state_change', 'docs/quality/guide-runs/property-lifecycle-local-latest.json', propertyLifecycleEvidence.finishedAt],
      ['expectedVersion409', 'stale_provider_update_rejected_409', 'docs/quality/guide-runs/property-lifecycle-local-latest.json', propertyLifecycleEvidence.finishedAt],
      ['decisionReason', 'provider_submit_and_admin_review_reason_validation', 'docs/quality/guide-runs/property-lifecycle-local-latest.json', propertyLifecycleEvidence.finishedAt],
      ['atomicAuditRollback', 'audit_failure_rolls_back_property_review_and_inserted_audit', 'docs/quality/guide-runs/property-guarantees-local-latest.json', propertyGuarantees.finishedAt],
    ]) reviewedGuarantees.push({ category, check, path, verifiedAt });
  }
  if (journey.id === 'GUIDE-05' && guide05LocalAcceptanceReady) {
    for (const [category, check, path, verifiedAt] of [
      ['horizontalAccess', 'foreign_records_excluded_from_owned_counts_and_projections', 'docs/quality/guide-runs/seeker-overview-projection-local-latest.json', seekerOverviewProjection.finishedAt],
      ['roleAuthorization', 'provider_and_admin_denied_seeker_overview', 'docs/quality/guide-runs/seeker-overview-access-local-latest.json', seekerOverviewAccess.finishedAt],
      ['currentSessionState', 'current_account_and_session_guard_plus_logout_revocation', 'docs/quality/guide-runs/seeker-overview-access-local-latest.json', seekerOverviewAccess.finishedAt],
    ]) reviewedGuarantees.push({ category, check, path, verifiedAt });
  }
  if (journey.id === 'GUIDE-02' && guide02LocalAcceptanceReady) {
    for (const [category, check, path, verifiedAt] of [
      ['horizontalAccess', 'favorite_records_are_isolated_by_seeker', 'docs/quality/guide-runs/favorites-access-http-local-latest.json', favoritesAccess.finishedAt],
      ['roleAuthorization', 'provider_admin_and_anonymous_denied_favorite_mutations', 'docs/quality/guide-runs/favorites-access-http-local-latest.json', favoritesAccess.finishedAt],
      ['currentSessionState', 'logout_revokes_favorite_operations', 'docs/quality/guide-runs/favorites-logout-local-latest.json', favoritesLogout.finishedAt],
      ['currentSessionState', 'current_account_state_denies_favorite_operations', 'docs/quality/guide-runs/favorites-access-http-local-latest.json', favoritesAccess.finishedAt],
      ['duplicateMutation', 'duplicate_save_keeps_single_favorite', 'docs/quality/guide-runs/favorites-access-http-local-latest.json', favoritesAccess.finishedAt],
    ]) reviewedGuarantees.push({ category, check, path, verifiedAt });
  }
  if (journey.id === 'GUIDE-09' && guide09LocalAcceptanceReady) {
    for (const [category, check] of [
      ['horizontalAccess', 'foreign_notification_hidden_and_unchanged'],
      ['roleAuthorization', 'provider_and_admin_denied_seeker_notifications'],
      ['currentSessionState', 'current_account_role_and_session_state_enforced'],
      ['duplicateMutation', 'repeat_and_concurrent_mark_read_preserve_single_timestamp'],
    ]) reviewedGuarantees.push({ category, check,
      path: 'docs/quality/guide-runs/seeker-notifications-guarantees-local-latest.json',
      verifiedAt: notificationGuarantees.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && sessionRevocation?.status === 'PASS_LOCAL'
    && sessionRevocation.mockedRoutes === false && sessionRevocation.cleanup === true
    && ['seeker', 'provider', 'admin'].every(roleType => sessionRevocation.runs?.some(run => run.roleType === roleType
      && run.foreignRevocation === 404 && run.revokedTokenRead === 401 && run.revokedTokenWrite === 401
      && run.ownOtherRevocation === 200 && run.remainingOwnSessions === 1 && run.auditDelta === 1))) {
    for (const category of ['currentSessionState', 'horizontalAccess']) reviewedGuarantees.push({ category,
      check: 'owned_session_revocation_denies_old_token_and_preserves_foreign_sessions',
      path: 'docs/quality/guide-runs/session-revocation-local-latest.json', verifiedAt: sessionRevocation.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && sessionRevocation?.atomicAuditRollback?.status === 500
    && sessionRevocation.atomicAuditRollback.sessionStillActive === true
    && sessionRevocation.atomicAuditRollback.auditDelta === 0) {
    reviewedGuarantees.push({ category: 'atomicAuditRollback',
      check: 'failed_session_audit_rolls_back_revocation_and_preserves_active_token',
      path: 'docs/quality/guide-runs/session-revocation-local-latest.json', verifiedAt: sessionRevocation.finishedAt });
  }
  if (journey.id === 'GUIDE-03' && communityInteractions?.status === 'PASS_LOCAL'
    && communityInteractions.mockedRoutes === false && communityInteractions.cleanup === true
    && communityInteractions.checks?.some(check => check.name === 'current_account_state_blocks_interactions' && check.pass === true)) {
    reviewedGuarantees.push({ category: 'currentSessionState', check: 'current_account_state_blocks_interactions',
      path: 'docs/quality/guide-runs/community-interactions-local-latest.json', verifiedAt: communityInteractions.finishedAt });
  }
  if (journey.id === 'GUIDE-03' && communityInteractions?.status === 'PASS_LOCAL'
    && communityInteractions.mockedRoutes === false && communityInteractions.cleanup === true) {
    for (const [category, check] of [
      ['duplicateMutation', 'reaction_toggle_switch_and_remove_without_duplicate_record'],
      ['horizontalAccess', 'reaction_records_are_isolated_by_authenticated_account'],
    ]) if (communityInteractions.checks?.some(item => item.name === check && item.pass === true)) {
      reviewedGuarantees.push({ category, check,
        path: 'docs/quality/guide-runs/community-interactions-local-latest.json',
        verifiedAt: communityInteractions.finishedAt });
    }
  }
  if (journey.id === 'GUIDE-06' && seekerPropertySearch?.status === 'PASS_LOCAL'
    && seekerPropertySearch.mockedRoutes === false && seekerPropertySearch.cleanup === true) {
    for (const [category, check] of [
      ['duplicateMutation', 'duplicate_active_property_search_rejected_without_second_record'],
      ['horizontalAccess', 'foreign_seeker_detail_hidden'],
    ]) if (seekerPropertySearch.checks?.includes(check)) reviewedGuarantees.push({ category, check,
      path: 'docs/quality/guide-runs/seeker-property-search-local-latest.json', verifiedAt: seekerPropertySearch.finishedAt });
  }
  if (journey.id === 'GUIDE-16' && providerCustomerRequest?.status === 'PASS_LOCAL'
    && providerCustomerRequest.mockedRoutes === false && providerCustomerRequest.cleanup === true) {
    for (const [category, check] of [
      ['duplicateMutation', 'duplicate_active_customer_request_rejected_without_second_record'],
      ['horizontalAccess', 'owner_list_and_foreign_provider_isolation'],
      ['currentSessionState', 'current_provider_account_state_overrides_issued_token'],
      ['roleAuthorization', 'seeker_token_denied_provider_customer_creation'],
      ['decisionReason', 'provider_contact_transition_persists_version_reason_and_audit'],
      ['expectedVersion409', 'invalid_reason_and_stale_version_leave_request_and_audit_unchanged'],
      ['atomicAuditRollback', 'failed_audit_rolls_back_request_transition_and_audit'],
    ]) if (providerCustomerRequest.checks?.includes(check)) reviewedGuarantees.push({ category, check,
      path: 'docs/quality/guide-runs/provider-customer-request-local-latest.json', verifiedAt: providerCustomerRequest.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && seekerAccountState?.status === 'PASS_LOCAL'
    && seekerAccountState.mockedRoutes === false && seekerAccountState.cleanup === true
    && ['suspended', 'rejected', 'role_changed', 'deleted'].every(state => seekerAccountState.checks?.some(check =>
      check.state === state && check.operationsDenied === 4 && check.profileUnchanged === true
      && check.status === (['suspended', 'rejected'].includes(state) ? 403 : 404)))) {
    reviewedGuarantees.push({ category: 'currentSessionState', check: 'current_account_state_denies_profile_and_preferences_operations',
      path: 'docs/quality/guide-runs/seeker-account-state-local-latest.json', verifiedAt: seekerAccountState.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && seekerAccountState?.status === 'PASS_LOCAL'
    && seekerAccountState.mockedRoutes === false && seekerAccountState.cleanup === true
    && ['provider', 'admin'].every(roleType => seekerAccountState.roleAuthorization?.some(check =>
      check.roleType === roleType && check.status === 403 && check.operationsDenied === 4 && check.profileUnchanged === true))) {
    reviewedGuarantees.push({ category: 'roleAuthorization', check: 'provider_and_admin_tokens_denied_on_seeker_profile_operations',
      path: 'docs/quality/guide-runs/seeker-account-state-local-latest.json', verifiedAt: seekerAccountState.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && seekerAccountState?.status === 'PASS_LOCAL'
    && seekerAccountState.mockedRoutes === false && seekerAccountState.cleanup === true
    && seekerAccountState.concurrentMutations?.disjointPatchStatuses?.every(status => status === 200)
    && seekerAccountState.concurrentMutations?.disjointFieldsPreserved === true
    && seekerAccountState.concurrentMutations?.identicalPatchStatuses?.every(status => status === 200)
    && seekerAccountState.concurrentMutations?.identicalFinalStateStable === true
    && seekerAccountState.concurrentMutations?.profileDocuments === 1) {
    reviewedGuarantees.push({ category: 'duplicateMutation',
      check: 'concurrent_disjoint_patches_preserved_and_identical_replay_keeps_one_profile',
      path: 'docs/quality/guide-runs/seeker-account-state-local-latest.json',
      verifiedAt: seekerAccountState.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && seekerAccountState?.atomicProfileRollback?.status === 500
    && seekerAccountState.atomicProfileRollback.userUnchanged === true
    && seekerAccountState.atomicProfileRollback.profileUnchanged === true) {
    reviewedGuarantees.push({ category: 'atomicProfileRollback',
      check: 'failed_profile_write_rolls_back_cross_collection_locale_update',
      path: 'docs/quality/guide-runs/seeker-account-state-local-latest.json',
      verifiedAt: seekerAccountState.finishedAt });
  }
  if (journey.id === 'GUIDE-03' && communityAccountState?.status === 'PASS_LOCAL'
    && communityAccountState.mockedRoutes === false && communityAccountState.cleanup === true
    && ['seeker', 'provider', 'admin'].every(roleType => ['suspended', 'rejected', 'role_changed', 'deleted'].every(state =>
      communityAccountState.checks?.some(check => check.roleType === roleType && check.state === state
        && check.mutationsDenied === 3 && check.directServiceOperationsDenied === 4 && check.writes === 0)))) {
    reviewedGuarantees.push({ category: 'currentSessionState', check: 'current_account_state_denies_public_community_mutations',
      path: 'docs/quality/guide-runs/community-account-state-local-latest.json',
      verifiedAt: communityAccountState.finishedAt });
  }
  // Record exactly what the reviewed runs demonstrate without promoting a
  // subcase to complete journey or Production closure.
  const reviewedSubcases = [];
  if (journey.id === 'GUIDE-01' && discoveryLocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API',
      check: 'homepage_search_filter_and_developer_discovery', path: 'docs/quality/GUIDE_01_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Homepage to property listing, live filtering, and developer directory to profile in both locales across Desktop, Tablet and Pixel 5.',
      verifiedAt: discoveryEvidence.finishedAt });
  }
  if (journey.id === 'GUIDE-02' && guide02LocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB',
      check: 'listing_detail_compare_developer_and_owned_favorite', path: 'docs/quality/GUIDE_02_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Public listing, property detail, two-property comparison and developer profile in six browser configurations plus owned favorite persistence and removal.',
      verifiedAt: discoveryEvidence.finishedAt });
  }
  if (journey.id === 'GUIDE-05' && guide05LocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB',
      check: 'owned_counts_activity_projection_and_navigation',
      path: 'docs/quality/GUIDE_05_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Real owned summary counts, safe activity projections and onward navigation in Arabic and English on Desktop, Tablet and Pixel 5.',
      verifiedAt: seekerOverviewNavigation.finishedAt });
    reviewedSubcases.push({ case: 'empty', evidenceType: 'Browser/API/MongoDB',
      check: 'genuinely_empty_account_overview',
      path: 'docs/quality/guide-runs/seeker-overview-empty-local-latest.json',
      scope: 'Six zero counters and empty activity panels through real browser/API/MongoDB in both locales and all three viewports.',
      verifiedAt: seekerOverviewEmpty.finishedAt });
    reviewedSubcases.push({ case: 'networkRetry', evidenceType: 'Browser/API/MongoDB',
      check: 'overview_retry_and_truthful_summary',
      path: 'docs/quality/guide-runs/seeker-overview-recovery-local-latest.json',
      scope: 'Aborted initial overview request, explicit retry and real HTTP 200 recovery without navigation or false counts in six locale/device runs.',
      verifiedAt: seekerOverviewRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-04' && guide04LocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB',
      check: 'email_otp_registration_dashboard_rbac_logout_and_cleanup',
      path: 'docs/quality/GUIDE_04_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Real email OTP and account creation in a Pixel 5 browser, authenticated dashboard, role denial, logout, persistence checks and zero residue.',
      verifiedAt: registrationBrowser.finishedAt });
    reviewedSubcases.push({ case: 'validation', evidenceType: 'Browser/API/MongoDB',
      check: 'registration_validation_and_duplicate_email_preserve_state',
      path: 'docs/quality/GUIDE_04_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Empty and mismatched-password browser validation in both locales and all viewports, plus duplicate-email rollback in isolated MongoDB.',
      verifiedAt: registrationGuarantees.finishedAt });
  }
  if (['GUIDE-11', 'GUIDE-12', 'GUIDE-13'].includes(journey.id) && providerRegistrationLocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB',
      check: 'provider_registration_documents_review_revision_approval_and_cleanup',
      path: 'docs/quality/GUIDE_11_12_13_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Real provider registration and review lifecycle in Arabic and English across Desktop, Tablet and Mobile with authoritative state, audit and cleanup checks.',
      verifiedAt: providerRegistrationEvidence.finishedAt });
    reviewedSubcases.push({ case: 'validation', evidenceType: 'Browser/API/MongoDB',
      check: 'incomplete_submit_reason_replay_duplicate_and_registration_rollback_validation',
      path: 'docs/quality/GUIDE_11_12_13_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Incomplete submission, review reason, stale action, duplicate document, grant replay, duplicate email and forced credential failure preserve the expected state.',
      verifiedAt: providerRegistrationGuarantees.finishedAt });
  }
  if (['GUIDE-14', 'GUIDE-15'].includes(journey.id) && propertyLifecycleLocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB',
      check: 'property_draft_submission_review_revision_publication_rejection_visibility_and_cleanup',
      path: 'docs/quality/GUIDE_14_15_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Real property creation and review lifecycle in Arabic and English across Desktop, Tablet and Mobile with safe public projection, audit and cleanup.',
      verifiedAt: propertyLifecycleEvidence.finishedAt });
    reviewedSubcases.push({ case: 'validation', evidenceType: 'Browser/API/MongoDB',
      check: 'incomplete_steps_reason_duplicate_submit_and_stale_version_preserve_state',
      path: 'docs/quality/guide-runs/property-lifecycle-local-latest.json',
      scope: 'Client validation and real HTTP 401/403/404/409/422 boundaries with MongoDB state checks.',
      verifiedAt: propertyLifecycleEvidence.finishedAt });
    reviewedSubcases.push({ case: 'empty', evidenceType: 'Browser/API/MongoDB',
      check: 'empty_property_search_clear_recovers_without_navigation',
      path: 'docs/quality/guide-runs/provider-properties-recovery-local-latest.json',
      scope: 'Owned property list empty filter state in Arabic and English on Desktop, Tablet and Pixel 5 without mutation.',
      verifiedAt: providerPropertiesRecovery.finishedAt });
    reviewedSubcases.push({ case: 'networkRetry', evidenceType: 'Browser/API/MongoDB',
      check: 'offline_property_filter_retry_recovers_without_navigation',
      path: 'docs/quality/guide-runs/provider-properties-recovery-local-latest.json',
      scope: 'Owned property list offline failure and explicit retry to real HTTP 200 in six locale/device runs without reload or mutation.',
      verifiedAt: providerPropertiesRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-22' && guide22LocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB',
      check: 'all_admin_content_surfaces_and_mutation_lifecycles',
      path: 'docs/quality/GUIDE_22_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'ADM-25 through ADM-32 in AR/EN across Desktop, Tablet and Pixel 5 plus real HTTP/MongoDB mutation lifecycles',
      verifiedAt: guide22ContentMutations.finishedAt });
    reviewedSubcases.push({ case: 'validation', evidenceType: 'API',
      check: 'invalid_article_cms_and_report_inputs_leave_state_consistent',
      path: 'docs/quality/guide-runs/guide22-content-mutations-local-latest.json',
      scope: 'Article transition, CMS reason/source and report validation through real local HTTP and MongoDB',
      verifiedAt: guide22ContentMutations.finishedAt });
  }
  if (journey.id === 'GUIDE-22' && guide22AdminContentBrowser?.status === 'PASS_LOCAL'
    && guide22AdminContentBrowser.mockedRoutes === false && guide22AdminContentBrowser.cleanup === true
    && guide22AdminContentBrowser.runs?.length === 6) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API',
      check: 'all_eight_admin_content_screens_render_real_api_without_overflow',
      path: 'docs/quality/guide-runs/guide22-admin-content-browser-local-latest.json',
      scope: 'ADM-25 through ADM-32; Arabic and English on Desktop, Tablet and Pixel 5',
      verifiedAt: guide22AdminContentBrowser.finishedAt });
  }
  if (journey.id === 'GUIDE-03' && communityInteractions?.status === 'PASS_LOCAL'
    && communityInteractions.mockedRoutes === false && communityInteractions.cleanup === true
    && ['reaction_toggle_switch_and_remove_without_duplicate_record', 'comment_persists_and_returns_in_public_detail'].every(name =>
      communityInteractions.checks?.some(check => check.name === name && check.pass === true))) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'API/MongoDB',
      check: 'comment_and_reaction_interactions_persist',
      path: 'docs/quality/guide-runs/community-interactions-local-latest.json',
      scope: 'Authenticated comment persistence and reaction add/switch/remove through real local HTTP and isolated MongoDB; not browser or Production evidence.',
      verifiedAt: communityInteractions.finishedAt });
  }
  if (journey.id === 'GUIDE-06' && seekerPropertySearch?.status === 'PASS_LOCAL'
    && seekerPropertySearch.mockedRoutes === false && seekerPropertySearch.cleanup === true
    && ['property_search_created_with_exact_public_payload', 'owned_list_and_detail_return_persisted_search_request',
      'seeker_cancellation_persisted_with_reason_version_and_audit'].every(check => seekerPropertySearch.checks?.includes(check))) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'API/MongoDB',
      check: 'property_search_create_list_detail_cancel',
      path: 'docs/quality/guide-runs/seeker-property-search-local-latest.json',
      scope: 'Property-search request creation, owned list/detail and cancellation through real local HTTP and isolated MongoDB; browser and Production remain open.',
      verifiedAt: seekerPropertySearch.finishedAt });
  }
  if (journey.id === 'GUIDE-16' && providerCustomerRequest?.status === 'PASS_LOCAL'
    && providerCustomerRequest.mockedRoutes === false && providerCustomerRequest.cleanup === true) {
    if (['provider_customer_request_created_with_exact_payload', 'owner_list_and_foreign_provider_isolation',
      'provider_contact_transition_persists_version_reason_and_audit'].every(check => providerCustomerRequest.checks?.includes(check))) {
      reviewedSubcases.push({ case: 'success', evidenceType: 'API/MongoDB',
        check: 'provider_customer_create_list_contact_transition',
        path: 'docs/quality/guide-runs/provider-customer-request-local-latest.json',
        scope: 'Provider customer request creation, owned list and contacted transition through real local HTTP and isolated MongoDB; browser and Production remain open.',
        verifiedAt: providerCustomerRequest.finishedAt });
    }
    if (providerCustomerRequest.checks?.includes('invalid_customer_request_rejected_without_write')) {
      reviewedSubcases.push({ case: 'validation', evidenceType: 'API',
        check: 'invalid_customer_request_rejected_without_write',
        path: 'docs/quality/guide-runs/provider-customer-request-local-latest.json',
        scope: 'Strict payload validation returned HTTP 400 and left the isolated requests collection empty.',
        verifiedAt: providerCustomerRequest.finishedAt });
    }
  }
  if (journey.id === 'GUIDE-16' && providerCustomerRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && providerCustomerRecovery.mockedRoutes === false && providerCustomerRecovery.cleanup === true
    && providerCustomerRecovery.temporaryRequestRemoved === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
      providerCustomerRecovery.runs?.some(run => run.locale === locale && run.device === device
        && run.checks?.includes('empty_search_clear_recovers_without_navigation')
        && run.checks?.includes('offline_filter_retry_recovers_without_navigation')
        && run.checks?.includes('invalid_form_blocks_request')
        && run.checks?.includes('browser_create_persists_owned_request')
        && run.scrollWidth <= run.innerWidth)))) {
    for (const [caseName, check] of [
      ['success', 'browser_create_persists_owned_request'],
      ['validation', 'invalid_form_blocks_request'],
      ['empty', 'empty_search_clear_recovers_without_navigation'],
      ['networkRetry', 'offline_filter_retry_recovers_without_navigation'],
    ]) reviewedSubcases.push({ case: caseName, evidenceType: 'Browser/API/MongoDB', check,
      path: 'docs/quality/guide-runs/provider-customer-recovery-local-latest.json',
      scope: 'Provider customer request list; Arabic and English on Desktop, Tablet and Pixel 5; real API and MongoDB with temporary request/session cleanup.',
      verifiedAt: providerCustomerRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-16' && providerProjectsRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && providerProjectsRecovery.mockedRoutes === false && providerProjectsRecovery.cleanup === true
    && providerProjectsRecovery.temporaryProjectsRemoved === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
      providerProjectsRecovery.runs?.some(run => run.locale === locale && run.device === device
        && run.checks?.includes('empty_search_clear_recovers_without_navigation')
        && run.checks?.includes('offline_filter_retry_recovers_without_navigation')
        && run.checks?.includes('invalid_form_blocks_request')
        && run.checks?.includes('browser_create_persists_owned_project')
        && run.scrollWidth <= run.innerWidth)))) {
    for (const [caseName, check] of [
      ['success', 'browser_create_persists_owned_project'],
      ['validation', 'invalid_form_blocks_request'],
      ['empty', 'empty_search_clear_recovers_without_navigation'],
      ['networkRetry', 'offline_filter_retry_recovers_without_navigation'],
    ]) reviewedSubcases.push({ case: caseName, evidenceType: 'Browser/API/MongoDB', check,
      path: 'docs/quality/guide-runs/provider-projects-recovery-local-latest.json',
      scope: 'Provider projects; Arabic and English on Desktop, Tablet and Pixel 5; real API and MongoDB with temporary project/session cleanup.',
      verifiedAt: providerProjectsRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-16' && providerViewingsRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && providerViewingsRecovery.mockedRoutes === false && providerViewingsRecovery.cleanup === true
    && providerViewingsRecovery.viewingsUnchanged === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device =>
      providerViewingsRecovery.runs?.some(run => run.locale === locale && run.device === device
        && run.checks?.includes('empty_status_filter_clear_recovers_without_navigation')
        && run.checks?.includes('offline_filter_retry_recovers_without_navigation')
        && Object.values(run.httpStatuses ?? {}).every(status => status === 200)
        && run.scrollWidth <= run.innerWidth)))) {
    for (const [caseName, check] of [
      ['empty', 'empty_status_filter_clear_recovers_without_navigation'],
      ['networkRetry', 'offline_filter_retry_recovers_without_navigation'],
    ]) reviewedSubcases.push({ case: caseName, evidenceType: 'Browser/API/MongoDB', check,
      path: 'docs/quality/guide-runs/provider-viewings-recovery-local-latest.json',
      scope: 'Provider viewing queue; Arabic and English on Desktop, Tablet and Pixel 5; real API and MongoDB snapshot with no viewing mutation and new-session cleanup.',
      verifiedAt: providerViewingsRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-16' && guide04Evidence?.status === 'PASS_LOCAL'
    && guide04Evidence.mockedRoutes === false
    && ['provider_browser_confirm_200', 'provider_browser_reschedule_200', 'provider_browser_complete_200',
      'provider_browser_cancel_200'].every(check => guide04Evidence.viewingJourneyEvidence?.checks?.includes(check))) {
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB',
      check: 'provider_viewing_confirm_reschedule_complete_cancel',
      path: 'docs/quality/guide-runs/guide-04-local-latest.json',
      scope: 'Provider viewing transitions through the real local browser/API/MongoDB journey.',
      verifiedAt: guide04Evidence.finishedAt });
    if (guide04Evidence.viewingJourneyEvidence?.checks?.includes('provider_browser_cancel_requires_reason')) {
      reviewedSubcases.push({ case: 'validation', evidenceType: 'Browser/API/MongoDB',
        check: 'provider_browser_cancel_requires_reason',
        path: 'docs/quality/guide-runs/guide-04-local-latest.json',
        scope: 'Provider viewing cancellation requires a reason before mutation.',
        verifiedAt: guide04Evidence.finishedAt });
    }
  }
  if (journey.id === 'GUIDE-10' && sessionBrowser?.status === 'PASS_LOCAL_SUBCASES'
    && sessionBrowser.mockedRoutes === false && sessionBrowser.sessionsClosed === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => sessionBrowser.runs?.some(run =>
      run.locale === locale && run.device === device && run.browserRevocation === 200 && run.revokedToken === 401
      && run.currentProfile === 200 && run.mongoRevoked === true)))) {
    reviewedSubcases.push({ case: 'sessionRevocation', check: 'browser_revocation_denies_target_token_preserves_current_session',
      path: 'docs/quality/guide-runs/session-browser-local-latest.json',
      scope: 'Six real browser/API/MongoDB seeker session revocations across device/locale combinations', verifiedAt: sessionBrowser.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && seekerSaveRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && seekerSaveRecovery.mockedRoutes === false && seekerSaveRecovery.restored === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => ['personal', 'preferences'].every(tab =>
      seekerSaveRecovery.runs?.some(run => run.locale === locale && run.device === device && run.tab === tab
        && run.check === 'offline_save_keeps_draft_then_persists_without_navigation' && run.httpStatus === 200 && run.mongoVerified === true))))) {
    reviewedSubcases.push({ case: 'networkRetry', check: 'offline_save_keeps_draft_then_persists_without_navigation',
      path: 'docs/quality/guide-runs/seeker-save-recovery-local-latest.json',
      scope: 'Personal profile and preferences; AR/EN on Desktop, Tablet and Pixel 5; real API and MongoDB with restored fixture',
      verifiedAt: seekerSaveRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && seekerSaveRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && seekerSaveRecovery.mockedRoutes === false && seekerSaveRecovery.restored === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => seekerSaveRecovery.runs?.some(run =>
      run.locale === locale && run.device === device && run.tab === 'preferences'
      && run.emptyHttpStatus === 200 && run.emptyStateVisible === true && run.emptyMongoUnchanged === true
      && run.innerWidth === run.scrollWidth)))) {
    reviewedSubcases.push({ case: 'empty', evidenceType: 'Browser/API/MongoDB',
      check: 'empty_preferences_render_editable_without_write',
      path: 'docs/quality/guide-runs/seeker-save-recovery-local-latest.json',
      scope: 'Preferences; AR/EN on Desktop, Tablet and Pixel 5; real browser/API/MongoDB with restored fixture',
      verifiedAt: seekerSaveRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-10' && seekerAccountState?.status === 'PASS_LOCAL'
    && seekerAccountState.mockedRoutes === false && seekerAccountState.cleanup === true
    && seekerAccountState.emptyPreferences?.status === 200
    && seekerAccountState.emptyPreferences.preferencesDeepEmpty === true
    && seekerAccountState.emptyPreferences.readDidNotWrite === true) {
    reviewedSubcases.push({ case: 'empty', evidenceType: 'API', check: 'empty_preferences_return_empty_object_without_write',
      path: 'docs/quality/guide-runs/seeker-account-state-local-latest.json',
      scope: 'Fresh seeker profile preferences through real HTTP and isolated MongoDB; component empty-state rendering is covered separately',
      verifiedAt: seekerAccountState.finishedAt });
  }
  if (journey.id === 'GUIDE-22' && communityBrowserRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && communityBrowserRecovery.mockedRoutes === false) {
    for (const [category, check] of [
      ['validation', 'invalid_reason_blocks_browser_mutation'],
      ['empty', 'empty_search_clear_recovers_without_navigation'],
      ['networkRetry', 'offline_retry_recovers_without_navigation'],
    ]) {
      if (['Desktop', 'Tablet', 'Pixel 5'].every(device => ['ar', 'en'].every(locale =>
        communityBrowserRecovery.runs?.some(run => run.device === device && run.locale === locale
          && run.status === 'PASS' && run.checks?.includes(check)
          && run.dimensions?.innerWidth === run.dimensions?.scrollWidth)))) {
        reviewedSubcases.push({ case: category, check,
          path: 'docs/quality/guide-runs/community-browser-recovery-local-latest.json',
          scope: 'Community post administration; Arabic and English; Desktop, Tablet and Pixel 5',
          verifiedAt: communityBrowserRecovery.finishedAt });
      }
    }
  }
  if (journey.id === 'GUIDE-09' && guide09LocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'networkRetry', check: 'notification_filter_offline_retry_without_reload',
      path: 'docs/quality/guide-runs/notification-recovery-local-latest.json',
      scope: 'Authenticated notifications; Arabic and English on Desktop, Tablet and Pixel 5', verifiedAt: notificationRecovery.finishedAt });
    reviewedSubcases.push({ case: 'success', evidenceType: 'Browser/API/MongoDB', check: 'list_mark_read_and_read_all',
      path: 'docs/quality/GUIDE_09_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Aggregated real browser/API/MongoDB notification journey', verifiedAt: notificationGuarantees.finishedAt });
    reviewedSubcases.push({ case: 'validation', evidenceType: 'API', check: 'anonymous_unknown_query_and_invalid_id_rejected',
      path: 'docs/quality/guide-runs/seeker-notifications-guarantees-local-latest.json',
      scope: 'Real HTTP with isolated MongoDB', verifiedAt: notificationGuarantees.finishedAt });
    reviewedSubcases.push({ case: 'empty', evidenceType: 'Browser/API/MongoDB', check: 'read_all_reaches_empty_and_replay_is_stable',
      path: 'docs/quality/GUIDE_09_LOCAL_ACCEPTANCE_2026-09-12.md',
      scope: 'Real browser plus isolated API/MongoDB state verification', verifiedAt: notificationGuarantees.finishedAt });
  }
  if (seekerAccountEvidence?.status === 'PASS_LOCAL' && seekerAccountEvidence.mockedRoutes === false) {
    const checks = journey.id === 'GUIDE-09' ? [['empty', 'mark_all_reached_empty_without_reload']]
      : journey.id === 'GUIDE-10' ? [['validation', 'invalid_preferences_blocked_before_api'], ['validation', 'invalid_password_confirmation_blocked']] : [];
    for (const [category, check] of checks) {
      if (seekerAccountEvidence.transitions?.includes(check)) reviewedSubcases.push({ case: category, check,
        path: 'docs/quality/guide-runs/seeker-account-local-latest.json',
        scope: 'Reviewed seeker browser subcase', verifiedAt: seekerAccountEvidence.finishedAt });
    }
  }
  if (["GUIDE-01", "GUIDE-02"].includes(journey.id)
    && discoveryValidation?.status === 'PASS_LOCAL_API_SUBCASES' && discoveryValidation.mockedRoutes === false
    && discoveryValidation.checks?.length === 7 && discoveryValidation.checks.every(check => check.status === 400)
    && discoveryValidation.validQueryAfterRejections === 200) {
    reviewedSubcases.push({ case: 'validation', evidenceType: 'API', check: 'invalid_public_property_queries_rejected',
      path: 'docs/quality/guide-runs/discovery-validation-local-latest.json',
      scope: discoveryValidation.scope, verifiedAt: discoveryValidation.finishedAt });
  }
  if (["GUIDE-01", "GUIDE-02"].includes(journey.id)
    && discoveryLocalAcceptanceReady) {
    reviewedSubcases.push({ case: 'networkRetry', evidenceType: 'Browser/API', check: 'offline_filter_retry_recovers_without_navigation',
      path: 'docs/quality/guide-runs/discovery-local-latest.json',
      scope: 'Property listing; Arabic and English on Desktop, Tablet and Pixel 5; browser offline fault and real API recovery without navigation',
      verifiedAt: discoveryEvidence.finishedAt });
  }
  if (["GUIDE-01", "GUIDE-02"].includes(journey.id)
    && discoveryLocalAcceptanceReady) {
    reviewedSubcases.push({
      case: "empty", evidenceType: 'Browser/API', check: "empty_results_reset_without_document_navigation",
      path: "docs/quality/guide-runs/discovery-local-latest.json",
      scope: "Property listing empty search and reset without document navigation in both locales on Desktop, Tablet and Pixel 5",
      verifiedAt: discoveryEvidence.finishedAt,
    });
  }
  if (["GUIDE-01", "GUIDE-02"].includes(journey.id)
    && discoveryPagination?.status === "PASS_LOCAL_SUBCASES"
    && discoveryPagination.mockedRoutes === false
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => discoveryPagination.runs?.some(run =>
      run.locale === locale && run.device === device
      && run.check === 'out_of_range_empty_page_recovers_to_page_one_without_navigation'
      && run.initialHttpStatus === 200 && run.recoveredHttpStatus === 200
      && run.documentReloaded === false && run.scrollWidth <= run.innerWidth)))) {
    reviewedSubcases.push({ case: 'empty', evidenceType: 'Browser/API',
      check: 'out_of_range_empty_page_recovers_to_page_one_without_navigation',
      path: 'docs/quality/guide-runs/discovery-pagination-local-latest.json',
      scope: 'Property listing out-of-range pagination; Arabic and English on Desktop, Tablet and Pixel 5; real API recovery without document navigation',
      verifiedAt: discoveryPagination.finishedAt });
  }
  if (journey.id === 'GUIDE-04'
    && registrationRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && registrationRecovery.mockedRoutes === false
    && registrationRecovery.otpChallengesRemoved === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => registrationRecovery.runs?.some(run =>
      run.locale === locale && run.device === device
      && run.checks?.includes('offline_registration_otp_retry_recovers_without_navigation')
      && run.checks?.includes('empty_registration_blocks_mutation')
      && run.checks?.includes('mismatched_password_blocks_mutation')
      && run.otpSendStatus === 202 && run.otpVerifyStatus === 200
      && run.registrationMutations === 0 && run.documentReloaded === false
      && run.scrollWidth <= run.innerWidth)))) {
    reviewedSubcases.push({ case: 'validation', evidenceType: 'Browser/API/MongoDB',
      check: 'invalid_registration_blocks_mutation',
      path: 'docs/quality/guide-runs/registration-recovery-local-latest.json',
      scope: 'Seeker registration; empty and mismatched password validation after real email OTP on Arabic and English Desktop, Tablet and Pixel 5',
      verifiedAt: registrationRecovery.finishedAt });
    reviewedSubcases.push({ case: 'networkRetry', evidenceType: 'Browser/API/MongoDB',
      check: 'offline_registration_otp_retry_recovers_without_navigation',
      path: 'docs/quality/guide-runs/registration-recovery-local-latest.json',
      scope: 'Seeker registration email OTP; browser offline fault and real MailHog/API recovery on Arabic and English Desktop, Tablet and Pixel 5',
      verifiedAt: registrationRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-08'
    && savedEmptyRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && savedEmptyRecovery.mockedRoutes === false
    && savedEmptyRecovery.sessionsRemoved === true
    && savedEmptyRecovery.favoritesUnchanged === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => savedEmptyRecovery.runs?.some(run =>
      run.locale === locale && run.device === device
      && run.apiHttpStatus === 200 && run.browserHttpStatus === 200
      && run.savedCount === 0 && run.scrollWidth <= run.innerWidth)))) {
    reviewedSubcases.push({ case: 'empty', evidenceType: 'Browser/API/MongoDB',
      check: 'empty_saved_properties_truthful',
      path: 'docs/quality/guide-runs/saved-empty-local-latest.json',
      scope: 'Saved properties empty state; AR/EN on Desktop, Tablet and Pixel 5; real browser/API/MongoDB with sessions removed and favorites unchanged',
      verifiedAt: savedEmptyRecovery.finishedAt });
  }
  if (journey.id === "GUIDE-07" && guide04Evidence?.status === "PASS_LOCAL") {
    const viewing = guide04Evidence.viewingJourneyEvidence;
    for (const [category, check] of [["empty", "empty_tabs_recover_without_refresh"], ["validation", "provider_browser_cancel_requires_reason"]]) {
      if (viewing?.status === "PASS_LOCAL_VIEWING_PARTIAL_GUIDE" && viewing.checks?.includes(check)) {
        reviewedSubcases.push({ case: category, check,
          path: "docs/quality/guide-runs/guide-04-local-latest.json",
          scope: "Viewing browser subcase; complete journey remains open",
          verifiedAt: guide04Evidence.finishedAt });
      }
    }
  }
  if (journey.id === 'GUIDE-07' && seekerViewingsRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && seekerViewingsRecovery.mockedRoutes === false && seekerViewingsRecovery.cleanup === true
    && seekerViewingsRecovery.viewingsUnchanged === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => seekerViewingsRecovery.runs?.some(run =>
      run.locale === locale && run.device === device
      && run.check === 'offline_tab_load_retry_recovers_without_navigation'
      && run.initialHttpStatus === 200 && run.recoveredHttpStatus === 200 && run.retryVisible === true
      && run.documentReloaded === false && run.scrollWidth <= run.innerWidth)))) {
    reviewedSubcases.push({ case: 'networkRetry', evidenceType: 'Browser/API/MongoDB',
      check: 'offline_tab_load_retry_recovers_without_navigation',
      path: 'docs/quality/guide-runs/seeker-viewings-recovery-local-latest.json',
      scope: 'Seeker viewings; AR/EN on Desktop, Tablet and Pixel 5; browser offline fault and real API recovery without database mutation',
      verifiedAt: seekerViewingsRecovery.finishedAt });
  }
  if (journey.id === 'GUIDE-06' && seekerRequestsRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && seekerRequestsRecovery.mockedRoutes === false && seekerRequestsRecovery.cleanup === true
    && seekerRequestsRecovery.temporaryRequestRemoved === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => seekerRequestsRecovery.runs?.some(run =>
      run.locale === locale && run.device === device && run.transitionRequests === 0 && run.requestUnchanged === true
      && run.httpStatuses?.initial === 200 && run.httpStatuses?.empty === 200 && run.httpStatuses?.reset === 200
      && run.httpStatuses?.recovered === 200 && run.httpStatuses?.detail === 200 && run.httpStatuses?.propertySearchDetail === 200
      && run.scrollWidth <= run.innerWidth)))) {
    for (const [category, check] of [
      ['success', 'property_search_list_and_detail_render_safe_persisted_payload'],
      ['empty', 'empty_search_clear_recovers_without_navigation'],
      ['networkRetry', 'offline_filter_retry_recovers_without_navigation'],
      ['validation', 'empty_cancel_reason_blocks_mutation'],
    ]) {
      if (seekerRequestsRecovery.runs.every(run => run.checks?.includes(check))) reviewedSubcases.push({
        case: category, evidenceType: 'Browser/API/MongoDB', check,
        path: 'docs/quality/guide-runs/seeker-requests-recovery-local-latest.json',
        scope: 'Seeker requests; AR/EN on Desktop, Tablet and Pixel 5; real browser/API/MongoDB with temporary request and sessions removed',
        verifiedAt: seekerRequestsRecovery.finishedAt,
      });
    }
  }
  if (journey.id === 'GUIDE-21' && adminRequestsRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && adminRequestsRecovery.mockedRoutes === false && adminRequestsRecovery.cleanup === true
    && adminRequestsRecovery.temporaryRequestRemoved === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => adminRequestsRecovery.runs?.some(run =>
      run.locale === locale && run.device === device && run.routeChecks?.length === 6
      && run.routeChecks.every(route => route.httpStatus === 200 && ['success', 'empty'].includes(route.state)
        && route.scrollWidth <= route.innerWidth)
      && run.httpStatuses?.contact === 200 && run.httpStatuses?.empty === 200 && run.httpStatuses?.reset === 200
      && run.httpStatuses?.recovered === 200 && run.transitionRequests === 0 && run.requestUnchanged === true
      && run.auditWrites === 0 && run.documentReloaded === false && run.scrollWidth <= run.innerWidth)))) {
    for (const [category, check] of [
      ['success', 'six_admin_request_routes_real_api'],
      ['empty', 'empty_search_clear_recovers_without_navigation'],
      ['networkRetry', 'offline_filter_retry_recovers_without_navigation'],
      ['validation', 'invalid_transition_reason_blocks_mutation'],
    ]) {
      if (adminRequestsRecovery.runs.every(run => run.checks?.includes(check))) reviewedSubcases.push({
        case: category, evidenceType: 'Browser/API/MongoDB', check,
        path: 'docs/quality/guide-runs/admin-requests-recovery-local-latest.json',
        scope: 'Six request administration screens; AR/EN on Desktop, Tablet and Pixel 5; real browser/API/MongoDB with temporary request and sessions removed',
        verifiedAt: adminRequestsRecovery.finishedAt,
      });
    }
  }
  if (journey.id === 'GUIDE-03' && communityPublicRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && communityPublicRecovery.mockedRoutes === false && communityPublicRecovery.cleanup === true
    && communityPublicRecovery.temporaryPostRemoved === true && communityPublicRecovery.sessionsRemoved === true
    && ['ar', 'en'].every(locale => ['desktop', 'tablet', 'mobile'].every(device => communityPublicRecovery.runs?.some(run =>
      run.locale === locale && run.device === device
      && run.publicHttpStatus === 200 && run.recoveredHttpStatus === 200 && run.postMutations === 0
      && run.documentReloaded === false && run.scrollWidth <= run.innerWidth)))) {
    for (const [category, check] of [
      ['validation', 'invalid_post_blocks_mutation'],
      ['empty', 'empty_category_filter_recovers_without_navigation'],
      ['networkRetry', 'offline_retry_recovers_without_navigation'],
    ]) {
      if (communityPublicRecovery.runs.every(run => run.checks?.includes(check))) reviewedSubcases.push({
        case: category, evidenceType: 'Browser/API/MongoDB', check,
        path: 'docs/quality/guide-runs/community-public-recovery-local-latest.json',
        scope: 'Public community feed; AR/EN on Desktop, Tablet and Pixel 5; real browser/API/MongoDB with temporary draft and sessions removed',
        verifiedAt: communityPublicRecovery.finishedAt,
      });
    }
  }
  appendMissingEvidence(reviewedSubcases, journey.reviewedSubcases,
    item => `${item.case ?? ''}|${item.check ?? ''}|${item.path ?? ''}`);
  const priorReviewedGuarantees = journey.id === 'GUIDE-04'
    ? journey.reviewedGuarantees?.filter(item => !(item.category === 'atomicAuditRollback'
      && item.check === 'credential_failure_rolls_back_grant_user_and_profile'))
    : journey.reviewedGuarantees;
  appendMissingEvidence(reviewedGuarantees, priorReviewedGuarantees,
    item => `${item.category ?? ''}|${item.check ?? ''}|${item.path ?? ''}`);
  return {
    ...hydratedJourney,
    actor: source.audience,
    preconditions: source.preconditions,
    uiRoutes: [...new Set(routeRows.map((row) => row.route).filter(Boolean))],
    apis: [...new Set(routeRows.flatMap((row) => row.apiDependencies ?? []))],
    mongoChanges: {
      status: executed ? "EVIDENCE_SCOPED" : "UNVERIFIED",
      collections: [],
      note: executed
        ? "See executionEvidence for the database observations captured by the executed subflow; unlisted collections are not claimed."
        : "No real MongoDB before/after evidence is attached for this complete journey yet.",
    },
    cases: {
      success: reviewedSubcases.some(item => item.case === 'success' && item.evidenceType === 'Browser/API/MongoDB')
        ? 'PARTIAL_BROWSER_API_MONGODB_EVIDENCE_ATTACHED' : executed ? "PARTIAL_EVIDENCE_ATTACHED" : "UNVERIFIED",
      validation: hydratedJourney.applicabilityReview?.validation === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : reviewedSubcases.some(item => item.case === 'validation' && item.evidenceType === 'Browser/API/MongoDB')
        ? 'PARTIAL_BROWSER_API_MONGODB_EVIDENCE_ATTACHED' : reviewedSubcases.some(item => item.case === "validation" && item.evidenceType === 'API') ? 'PARTIAL_API_EVIDENCE_ATTACHED' : reviewedSubcases.some(item => item.case === "validation") ? "PARTIAL_BROWSER_EVIDENCE_ATTACHED" : "UNVERIFIED_COMPLETE_JOURNEY",
      empty: reviewedSubcases.some(item => item.case === "empty" && item.evidenceType === 'Browser/API/MongoDB') ? 'PARTIAL_BROWSER_API_MONGODB_EVIDENCE_ATTACHED' : reviewedSubcases.some(item => item.case === "empty" && item.evidenceType === 'API') ? 'PARTIAL_API_EVIDENCE_ATTACHED' : reviewedSubcases.some(item => item.case === "empty") ? "PARTIAL_BROWSER_EVIDENCE_ATTACHED" : "UNVERIFIED_COMPLETE_JOURNEY",
      networkRetry: reviewedSubcases.some(item => item.case === 'networkRetry' && item.evidenceType === 'Browser/API/MongoDB')
        ? 'PARTIAL_BROWSER_API_MONGODB_EVIDENCE_ATTACHED' : reviewedSubcases.some(item => item.case === 'networkRetry') ? 'PARTIAL_BROWSER_EVIDENCE_ATTACHED' : "UNVERIFIED_COMPLETE_JOURNEY",
      duplicateMutation: hydratedJourney.applicabilityReview?.duplicateMutation === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : guaranteeStatus('duplicateMutation'),
    },
    reviewedSubcases,
    reviewedGuarantees,
    permissions: {
      requiredRoles: [...new Set(routeRows.map((row) => row.requiredRole).filter(Boolean))],
      horizontalAccess: hydratedJourney.applicabilityReview?.horizontalAccess === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : guaranteeStatus('horizontalAccess'),
      currentSessionState: hydratedJourney.applicabilityReview?.currentSessionState === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : guaranteeStatus('currentSessionState'),
      roleAuthorization: hydratedJourney.applicabilityReview?.roleAuthorization === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : guaranteeStatus('roleAuthorization'),
    },
    versionAndAudit: {
      expectedVersion409: hydratedJourney.applicabilityReview?.expectedVersion409 === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : guaranteeStatus('expectedVersion409'),
      decisionReason: hydratedJourney.applicabilityReview?.decisionReason === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : guaranteeStatus('decisionReason'),
      atomicAuditRollback: hydratedJourney.applicabilityReview?.atomicAuditRollback === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' : guaranteeStatus('atomicAuditRollback'),
    },
    environment: {
      local: executed ? "PARTIAL" : "NOT_EXECUTED",
      production: "NOT_EXECUTED_AFTER_CURRENT_COMMIT",
    },
    userGuide: {
      path: matrix.guidePath,
      section: `#${source.sectionId}`,
      journeyId: journey.id,
    },
    executionDate: evidenceDate(hydratedJourney),
    commit: guide.release.baselineCommit,
    legacyStatus,
    verificationStatus: "PARTIAL",
    incompleteReason: hydratedJourney.localAcceptanceReview?.status === 'LOCAL_FUNCTIONAL_SCOPE_REVIEWED'
      ? "Local functional scope is reviewed; Production verification, independent Figma acceptance, and the final project-wide quality gate remain open."
      : executed
      ? "Only the evidence named on this row is proven; the complete success, failure, retry, permission, MongoDB and Production scope remains open."
      : "Guide and route mapping exist, but no complete real browser/API/MongoDB execution evidence is attached.",
  };
});
const providerAccountTypes = ["individual_provider", "broker", "developer_company"];
const expandedAudience = (audience) => [...new Set(audience.flatMap((accountType) => accountType === "provider" ? providerAccountTypes : [accountType]))];
const uniqueScreens = new Set(matrix.journeys.flatMap((journey) => journey.screenIds));
const uniqueRoutes = new Set(matrix.journeys.flatMap((journey) => journey.uiRoutes));
const uniqueApis = new Set(matrix.journeys.flatMap((journey) => journey.apis));
const unreferencedScreenIds = routeMatrix.rows.map((row) => row.screenId).filter((screenId) => !uniqueScreens.has(screenId));
matrix.operationalEvidenceCoverage = {
  contract: "Coverage means that reviewable local execution evidence is attached. It does not mean full closure until every required case, Figma frame and Production run is verified.",
  accountTypes: guide.accountTypes.map((accountType) => {
    const journeys = matrix.journeys.filter((journey) => expandedAudience(journey.actor).includes(accountType));
    return {
      accountType,
      journeyIds: journeys.map((journey) => journey.id),
      journeysWithLocalEvidence: journeys.filter(hasExecutedEvidence).length,
      totalJourneys: journeys.length,
      productionVerified: 0,
    };
  }),
  featureInventory: {
    guideJourneys: matrix.journeys.length,
    journeysWithLocalEvidence: matrix.journeys.filter(hasExecutedEvidence).length,
    totalProductScreens: routeMatrix.rows.length,
    guideReferencedScreens: uniqueScreens.size,
    unreferencedScreenIds,
    mappedRoutes: uniqueRoutes.size,
    declaredApiDependencies: uniqueApis.size,
    apiDependencyGap: uniqueApis.size === 0 ? "The screen-route source has no API dependencies populated; runtime HTTP evidence remains attached per lifecycle report." : null,
  },
  lifecycleEvidence: [
    { scope: "seeker registration, favorites, contact requests and viewings", path: "docs/quality/guide-runs/guide-04-local-latest.json", status: guide04Evidence?.status ?? "MISSING" },
    { scope: "seeker profile, preferences, notifications and password", path: "docs/quality/guide-runs/seeker-account-local-latest.json", status: seekerAccountEvidence?.status ?? "MISSING" },
    { scope: "provider application, documents, review and approval", path: "docs/quality/guide-runs/provider-registration-local-latest.json", status: providerRegistrationEvidence?.status ?? "MISSING" },
    { scope: "property creation, payment plans, review, publication and visibility", path: "docs/quality/guide-runs/property-lifecycle-local-latest.json", status: propertyLifecycleEvidence?.status ?? "MISSING" },
    { scope: "community creation, moderation, conflict handling and audit", path: "docs/quality/guide-runs/community-local-latest.json", status: communityEvidence?.status ?? "MISSING" },
    { scope: "request authorization, concurrency, rollback, audit and viewing slots", path: "docs/quality/guide-runs/request-guarantees-local-latest.json", status: requestGuaranteesEvidence?.status ?? "MISSING" },
    { scope: "provider and administrator remaining screen surfaces", path: "docs/quality/guide-runs/remaining-surfaces-local-latest.json", status: remainingSurfacesEvidence?.status ?? "MISSING" },
    { scope: "privacy settings consumers and authorization boundaries", path: "docs/quality/guide-runs/privacy-security-local-latest.json", status: privacySecurityEvidence?.status ?? "MISSING" },
  ],
};
matrix.executionSummary = {
  updatedAt: matrix.generatedAt,
  totalJourneys: matrix.journeys.length,
  verified: matrix.journeys.filter((journey) => journey.verificationStatus === "VERIFIED").length,
  partial: matrix.journeys.filter((journey) => journey.verificationStatus === "PARTIAL").length,
  blocked: matrix.journeys.filter((journey) => journey.verificationStatus === "BLOCKED").length,
  localWithAnyExecutionEvidence: matrix.journeys.filter(hasExecutedEvidence).length,
  productionVerified: 0,
  fullyClosed: 0,
};

await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
console.log(JSON.stringify(matrix.executionSummary));
