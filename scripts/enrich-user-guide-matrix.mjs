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
const discoveryRecovery = await readFile('docs/quality/guide-runs/discovery-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const discoveryValidation = await readFile('docs/quality/guide-runs/discovery-validation-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const notificationRecovery = await readFile('docs/quality/guide-runs/notification-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityGuarantees = await readFile('docs/quality/guide-runs/community-guarantees-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
const communityBrowserRecovery = await readFile('docs/quality/guide-runs/community-browser-recovery-local-latest.json', 'utf8').then(JSON.parse).catch(() => null);
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

const supplementalRuns = [
  ["docs/quality/guide-runs/admin-requests-local-latest.json", adminRequestsEvidence],
  ["docs/quality/guide-runs/privacy-security-local-latest.json", privacySecurityEvidence],
  ["docs/quality/guide-runs/provider-registration-local-latest.json", providerRegistrationEvidence],
  ["docs/quality/guide-runs/seeker-account-local-latest.json", seekerAccountEvidence],
  ["docs/quality/guide-runs/property-lifecycle-local-latest.json", propertyLifecycleEvidence],
  ["docs/quality/guide-runs/remaining-surfaces-local-latest.json", remainingSurfacesEvidence],
  ["docs/quality/guide-runs/discovery-local-latest.json", discoveryEvidence],
].filter(([, evidence]) => evidence?.status?.startsWith("PASS_LOCAL"));

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
  const routeRows = journey.screenIds.map((screenId) => rowsByScreen.get(screenId)).filter(Boolean);
  const legacyStatus = journey.verificationStatus;
  const executed = hasExecutedEvidence(hydratedJourney);
  const reviewedGuarantees = reviewedJourneyGuarantees(journey.id, {
    requests: requestGuaranteesEvidence, community: communityEvidence, communityGuarantees,
    privacy: privacySecurityEvidence, seeker: seekerAccountEvidence,
  });
  const guaranteeStatus = category => reviewedGuarantees.some(item => item.category === category)
    ? "PARTIAL_API_EVIDENCE_ATTACHED" : "UNVERIFIED";
  // Record exactly what the reviewed runs demonstrate without promoting a
  // subcase to complete journey or Production closure.
  const reviewedSubcases = [];
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
  if (journey.id === 'GUIDE-09' && notificationRecovery?.status === 'PASS_LOCAL_SUBCASES'
    && notificationRecovery.mockedRoutes === false
    && ['ar', 'en'].every(locale => notificationRecovery.runs?.some(run => run.locale === locale && run.status === 'PASS'))) {
    reviewedSubcases.push({ case: 'networkRetry', check: 'notification_filter_offline_retry_without_reload',
      path: 'docs/quality/guide-runs/notification-recovery-local-latest.json',
      scope: 'Authenticated notifications; Arabic and English on Pixel 5', verifiedAt: notificationRecovery.finishedAt });
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
    && discoveryRecovery?.status === 'PASS_LOCAL_SUBCASES' && discoveryRecovery.mockedRoutes === false
    && ['ar', 'en'].every(locale => discoveryRecovery.runs?.some(run => run.locale === locale && run.status === 'PASS' && run.check === 'offline_filter_retry_recovers_without_navigation'))) {
    reviewedSubcases.push({ case: 'networkRetry', check: 'offline_filter_retry_recovers_without_navigation',
      path: 'docs/quality/guide-runs/discovery-recovery-local-latest.json',
      scope: 'Property listing; Arabic and English on Pixel 5; browser offline fault and real API recovery',
      verifiedAt: discoveryRecovery.finishedAt });
  }
  if (["GUIDE-01", "GUIDE-02"].includes(journey.id)
    && discoveryEvidence?.status === "PASS_LOCAL_PARTIAL"
    && discoveryEvidence.mockedRoutes === false
    && discoveryEvidence.transitions?.includes("empty_results_reset_without_document_navigation")) {
    reviewedSubcases.push({
      case: "empty", check: "empty_results_reset_without_document_navigation",
      path: "docs/quality/guide-runs/discovery-local-latest.json",
      scope: "Property listing empty search and reset without document navigation",
      verifiedAt: discoveryEvidence.finishedAt,
    });
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
      success: executed ? "PARTIAL_EVIDENCE_ATTACHED" : "UNVERIFIED",
      validation: reviewedSubcases.some(item => item.case === "validation" && item.evidenceType === 'API') ? 'PARTIAL_API_EVIDENCE_ATTACHED' : reviewedSubcases.some(item => item.case === "validation") ? "PARTIAL_BROWSER_EVIDENCE_ATTACHED" : "UNVERIFIED_COMPLETE_JOURNEY",
      empty: reviewedSubcases.some(item => item.case === "empty") ? "PARTIAL_BROWSER_EVIDENCE_ATTACHED" : "UNVERIFIED_COMPLETE_JOURNEY",
      networkRetry: reviewedSubcases.some(item => item.case === 'networkRetry') ? 'PARTIAL_BROWSER_EVIDENCE_ATTACHED' : "UNVERIFIED_COMPLETE_JOURNEY",
      duplicateMutation: guaranteeStatus('duplicateMutation'),
    },
    reviewedSubcases,
    reviewedGuarantees,
    permissions: {
      requiredRoles: [...new Set(routeRows.map((row) => row.requiredRole).filter(Boolean))],
      horizontalAccess: guaranteeStatus('horizontalAccess'),
      currentSessionState: guaranteeStatus('currentSessionState'),
      roleAuthorization: guaranteeStatus('roleAuthorization'),
    },
    versionAndAudit: {
      expectedVersion409: guaranteeStatus('expectedVersion409'),
      decisionReason: guaranteeStatus('decisionReason'),
      atomicAuditRollback: guaranteeStatus('atomicAuditRollback'),
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
    incompleteReason: executed
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
