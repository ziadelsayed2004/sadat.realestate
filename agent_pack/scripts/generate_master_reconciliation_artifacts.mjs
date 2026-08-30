import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const generatedAt = new Date().toISOString();
const reportDate = '2026-08-31';
const canonicalFigmaFileKey = 'Odl1Epn2u6lIEuIMmABT7o';
const forbiddenFigmaFileKey = '0HBdTNGROmmpC6S7OYa3iJ';
const approvedLocales = ['ar', 'en'];
const excludedLocales = ['zh-CN'];
const activeProgramId = 'SADAT_G1_G6_APPROVED_2026-08-30';
const activeTaskIds = [
  'frontend_106', 'backend_150', 'frontend_112', 'backend_151', 'frontend_107',
  'backend_152', 'backend_153', 'backend_154', 'backend_155', 'frontend_108',
  'backend_156', 'frontend_109', 'frontend_110', 'frontend_111', 'backend_157',
  'backend_158', 'backend_159', 'frontend_113', 'frontend_114', 'frontend_115',
  'frontend_116', 'frontend_117', 'frontend_118', 'frontend_119', 'frontend_120',
];
const ownershipManifestRelativePath = 'agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30.json';
const ownershipCorrectionRelativePath = 'agent_pack/08_reality_sync/FRONTEND_106_POST_COMPLETION_RECONCILIATION_2026-08-30.json';
const externalExceptionIds = new Set([
  ...Array.from({ length: 10 }, (_, index) => `SEK-${String(index + 1).padStart(2, '0')}`),
  'PRV-01', ...Array.from({ length: 8 }, (_, index) => `PRV-${String(index + 3).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `PRV-${String(index + 15).padStart(2, '0')}`),
  'PRV-22-2', 'PRV-22-3', 'ADM-18', 'ADM-54',
]);

const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const writeText = (relativePath, value) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value, 'utf8');
};
const writeJson = (relativePath, value) => writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`);
const relative = (absolutePath) => path.relative(root, absolutePath).replaceAll('\\', '/');
const sha256Buffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = (absolutePath) => {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(absolutePath));
  return hash.digest('hex');
};
const safeArray = (value) => Array.isArray(value) ? value : [];
const firstString = (...values) => values.find((value) => typeof value === 'string' && value.length > 0) || null;
const commandOutput = (command, args) => {
  try {
    return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
};

const screenRegistry = readJson('agent_pack/01_product/SCREEN_REGISTRY.json');
const designManifest = readJson('agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json');
const queue = readJson('docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json');
const finalReport = readJson('agent_pack/08_reality_sync/FINAL_131_INTEGRATION_REPORT_2026-08-29.json');
const precommitReport = readJson('agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_REPORT_2026-08-30.json');
const apiBlueprint = readJson('agent_pack/01_product/API_ENDPOINT_BLUEPRINT.json');
const activeProgram = readJson('agent_pack/03_execution/ACTIVE_DELIVERY_PROGRAM.json');
const taskState = readJson('agent_pack/03_execution/TASK_STATE.json');
const taskCatalog = readJson('agent_pack/03_execution/TASK_CATALOG.json');
const checkpoint = readJson('agent_pack/03_execution/RUN_CHECKPOINT.json');
const manifest = readJson('agent_pack/03_execution/MANIFEST.json');
const stepInfoPath = path.join(root, 'agent_pack', 'step_info.json');
const stepInfo = fs.existsSync(stepInfoPath) ? JSON.parse(fs.readFileSync(stepInfoPath, 'utf8')) : null;
const routeMapText = readText('agent_pack/01_product/FRONTEND_ROUTE_MAP.md');

const registryRows = Array.isArray(screenRegistry) ? screenRegistry : safeArray(screenRegistry.screens);
const designRows = safeArray(designManifest.screens);
const queueRows = safeArray(queue.screens);
const apiRows = Array.isArray(apiBlueprint) ? apiBlueprint : safeArray(apiBlueprint.endpoints);
const registryById = new Map(registryRows.map((row) => [row.id || row.screenId, row]));
const designById = new Map(designRows.map((row) => [row.id || row.screenId, row]));
const queueById = new Map(queueRows.map((row) => [row.screenId || row.id, row]));

const routeByScreenId = new Map();
for (const line of routeMapText.split(/\r?\n/u)) {
  const match = line.match(/^\|\s*([A-Z]+-\d+(?:-\d+)?)\s*\|\s*`?([^|`]+?)`?\s*\|/u);
  if (match) routeByScreenId.set(match[1], match[2].trim());
}

const surfaceCounts = registryRows.reduce((counts, row) => {
  const surface = row.surface || 'unknown';
  counts[surface] = (counts[surface] || 0) + 1;
  return counts;
}, {});

const exceptionDetails = (screenId) => {
  if (!externalExceptionIds.has(screenId)) return null;
  if (screenId === 'ADM-18') {
    return {
      owner: 'design/source owner',
      reason: 'The exact canonical clone node is unavailable; no invented node or historical Figma parity claim is permitted.',
      classification: 'BLOCKED_SOURCE',
      nextAtomicTask: 'frontend_118',
    };
  }
  if (screenId === 'ADM-54') {
    return {
      owner: 'project owner and external design-source owner',
      reason: 'Only the owner-authored local baseline is available; exact historical Figma source parity is not established.',
      classification: 'PARTIAL_EXTERNAL',
      nextAtomicTask: 'frontend_118',
    };
  }
  if (screenId.startsWith('SEK-')) {
    return {
      owner: 'external source, fixture, and contract owner',
      reason: 'Safe Seeker projections, fixtures, or exact source inputs remain external to this repository reconciliation.',
      classification: 'PARTIAL_EXTERNAL',
      nextAtomicTask: 'frontend_116',
    };
  }
  if (screenId.startsWith('PRV-')) {
    return {
      owner: 'external source, fixture, and contract owner',
      reason: 'Safe Provider projections, fixtures, or exact source inputs remain external to this repository reconciliation.',
      classification: 'PARTIAL_EXTERNAL',
      nextAtomicTask: 'frontend_117',
    };
  }
  return null;
};

const evidencePathList = (row) => {
  const evidence = row.evidence || {};
  const latest = row.coordinatorReconciliation?.latestEvidence || {};
  const paths = [
    row.evidenceDir,
    evidence.figmaScreenshot?.path,
    evidence.runtimeBefore?.path,
    evidence.runtimeAfter?.path,
    evidence.reviewedDiff?.path,
    evidence.structuredVisualComparison?.diffPath,
    evidence.structuredVisualComparison?.metricsPath,
    latest.reviewPath,
    latest.primaryAfterPath,
    latest.primaryDiffPath,
    latest.primaryMetricsPath,
  ];
  return [...new Set(paths.filter((value) => typeof value === 'string' && value.length > 0))];
};

const stateStatus = (row, stateName) => {
  const deterministicStates = safeArray(row.deterministicState?.state).map((value) => String(value).toLowerCase());
  const text = JSON.stringify({ deterministicState: row.deterministicState, evidence: row.evidence }).toLowerCase();
  if (deterministicStates.includes(stateName) || text.includes(`"${stateName}"`)) return 'RECORDED_IN_EXISTING_EVIDENCE';
  if (stateName === 'success' && row.evidence?.functionalApiComparison) return 'HISTORICAL_FUNCTIONAL_EVIDENCE_PRESENT';
  return 'NOT_RECORDED_IN_CURRENT_SCREEN_LEDGER';
};

const screenGapRows = registryRows.map((registryRow) => {
  const screenId = registryRow.id || registryRow.screenId;
  const queueRow = queueById.get(screenId) || {};
  const designRow = designById.get(screenId) || {};
  const queueEvidence = queueRow.evidence || {};
  const localSources = safeArray(designRow.localSources).map((source) => ({
    path: source.localPath || null,
    sha256: source.sha256 || null,
    width: source.width ?? null,
    height: source.height ?? null,
    authority: source.authority || null,
    figmaFileKey: source.figmaFileKey || designRow.canonicalFigmaFileKey || canonicalFigmaFileKey,
    figmaPageId: source.figmaPageId || designRow.figmaPageId || null,
    figmaFrameNodeId: source.figmaFrameNodeId || queueRow.clone?.nodeId || null,
    retrievedAt: source.retrievedAt || null,
    historicalParityClaim: source.historicalParityClaim ?? null,
  }));
  const exception = exceptionDetails(screenId);
  const classification = queueRow.coordinatorClassification || queueRow.classification || 'UNRESOLVED_IN_EXISTING_EVIDENCE';
  const latestEvidence = queueRow.coordinatorReconciliation?.latestEvidence || {};
  const captureMetrics = safeArray(latestEvidence.captures).map((capture) => ({
    locale: capture.locale || null,
    direction: capture.direction || null,
    sourceSha256: capture.sha256 || null,
    materialDifferencePercent: capture.materialDifferencePercent ?? null,
    antiAliasingOnlyPercent: capture.antiAliasingOnlyPercent ?? null,
  }));
  const directReviewStatus = exception
    ? 'OPEN_EXTERNAL_OR_SOURCE_EXCEPTION_NOT_VERIFIED_IN_THIS_GOAL'
    : 'HISTORICAL_REVIEW_REUSED_NOT_REFETCHED_IN_THIS_GOAL';
  const runtimeAfter = queueEvidence.runtimeAfter || {};
  const runtimeBefore = queueEvidence.runtimeBefore || {};
  const figmaContext = queueEvidence.figmaContext || {};
  const functionEvidence = queueEvidence.functionalApiComparison || null;
  const accessibilityEvidence = queueEvidence.accessibility || null;
  const focusedTests = safeArray(queueEvidence.focusedTests);
  return {
    screenId,
    surface: registryRow.surface || queueRow.surface || null,
    canonicalRoute: routeByScreenId.get(screenId) || queueRow.runtime?.route || null,
    canonicalRouteSource: routeByScreenId.has(screenId) ? 'agent_pack/01_product/FRONTEND_ROUTE_MAP.md' : 'SCREEN_EXECUTION_QUEUE.runtime.route',
    role: queueRow.runtime?.role || null,
    figmaNode: {
      canonicalFileKey: queueRow.clone?.fileKey || designRow.canonicalFigmaFileKey || canonicalFigmaFileKey,
      forbiddenFileKey: forbiddenFigmaFileKey,
      pageId: queueRow.clone?.pageId || designRow.figmaPageId || null,
      nodeId: queueRow.clone?.nodeId || null,
      nodeIds: safeArray(queueRow.clone?.nodeIds),
      sourceAuthority: queueRow.sourceAuthority || null,
    },
    sourceProvenance: {
      sourceManifestPath: 'agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json',
      registryPath: 'agent_pack/01_product/SCREEN_REGISTRY.json',
      sourceStatus: registryRow.sourceStatus || designRow.sourceStatus || null,
      visualSourceStatus: registryRow.visualSourceStatus || designRow.visualSourceStatus || null,
      localSources,
      canonicalFigmaFileKey,
      historicalParityClaim: localSources.some((source) => source.historicalParityClaim === true) ? true : false,
    },
    deviceScope: registryRow.deviceScope || queueRow.runtime?.devices || [],
    arEnEvidence: {
      approvedLocales,
      approvedDirections: { ar: 'rtl', en: 'ltr' },
      queueLocales: queueRow.runtime?.locales || [],
      queueDirections: queueRow.runtime?.directions || [],
      excludedLocales,
      status: 'HISTORICAL_EVIDENCE_REUSED_NOT_RERUN_IN_THIS_GOAL',
      evidencePath: 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json',
    },
    runtimeState: {
      status: queueRow.deterministicState?.status || 'NOT_RECORDED',
      coordinatorEvidenceStatus: queueRow.deterministicState?.coordinatorEvidenceStatus || null,
      processingState: queueRow.processingState || null,
      repairStatus: queueRow.repairStatus || null,
      coordinatorStatus: queueRow.coordinatorStatus || null,
      state: queueRow.deterministicState?.state || [],
      authSession: queueRow.deterministicState?.authSession || null,
    },
    apiFixture: {
      fixtures: queueRow.deterministicState?.apiFixtures || [],
      functionalComparison: functionEvidence ? {
        reviewed: functionEvidence.reviewed ?? null,
        requestProjection: functionEvidence.requestProjection || null,
        responseProjection: functionEvidence.responseProjection || null,
        outcome: functionEvidence.outcome || null,
      } : null,
    },
    stateCoverage: {
      loading: { status: stateStatus(queueRow, 'loading') },
      empty: { status: stateStatus(queueRow, 'empty') },
      error: { status: stateStatus(queueRow, 'error') },
      retry: { status: stateStatus(queueRow, 'retry') },
      success: { status: stateStatus(queueRow, 'success') },
    },
    accessibility: {
      status: accessibilityEvidence || focusedTests.some((test) => /accessibility|a11y/iu.test(test.name || ''))
        ? 'HISTORICAL_ACCESSIBILITY_EVIDENCE_PRESENT'
        : 'NOT_RECORDED_IN_CURRENT_SCREEN_LEDGER',
      evidence: accessibilityEvidence || focusedTests.filter((test) => /accessibility|a11y/iu.test(test.name || '')).map((test) => ({ name: test.name || null, exitCode: test.exitCode ?? null })),
    },
    interaction: {
      status: functionEvidence ? 'HISTORICAL_FUNCTIONAL_EVIDENCE_PRESENT' : 'NOT_RECHECKED_IN_THIS_GOAL',
      evidencePath: evidencePathList(queueRow)[0] || null,
    },
    regressionSnapshot: {
      lane: 'RUNTIME_REGRESSION_ONLY',
      status: runtimeAfter.sha256 ? 'HISTORICAL_RUNTIME_EVIDENCE_RECORDED_NOT_RERUN' : 'NOT_RECORDED',
      runtimeBeforePath: runtimeBefore.path || null,
      runtimeBeforeSha256: runtimeBefore.sha256 || null,
      runtimeAfterPath: runtimeAfter.path || null,
      runtimeAfterSha256: runtimeAfter.sha256 || null,
      parityClaim: false,
    },
    directFigmaReview: {
      status: directReviewStatus,
      authenticatedReviewInThisGoal: false,
      newFigmaFetchInThisGoal: false,
      existingReviewEvidence: figmaContext.reviewed === true || queueEvidence.figmaScreenshot?.reviewed === true,
      existingReviewResult: figmaContext.resultStatus || null,
      canonicalFileKey: canonicalFigmaFileKey,
      forbiddenFileKeyNotUsed: forbiddenFigmaFileKey,
      rawMetrics: captureMetrics,
      metricPolicy: 'Full-canvas transparent metrics only; no masks, crops, overlays, hidden regions, or anti-alias masks.',
    },
    exactDefect: safeArray(queueEvidence.defects).length > 0 ? queueEvidence.defects : ['NONE_RECORDED_IN_CURRENT_SOURCES; this is not a new defect-free claim.'],
    externalBlocker: exception ? [exception.reason] : [],
    owner: exception?.owner || 'NOT_EXPLICITLY_ASSIGNED_IN_CURRENT_EVIDENCE',
    nextAtomicTask: exception
      ? { taskId: exception.nextAtomicTask, reason: 'Surface-specific parity task after prerequisite gates; no task is started by this reconciliation.' }
      : { taskId: null, reason: 'No screen-specific repair is authorized by this reconciliation; preserve existing evidence until a dependency-ready task owns a change.' },
    honestClassification: {
      historicalClassification: classification,
      currentGoalClassification: exception ? exception.classification : 'CLOSURE_ELIGIBLE_HISTORICAL_EVIDENCE_REUSED',
      closureEligibleAccordingToBaseline: !exception,
      fullParityClaim: false,
      notes: queueRow.notes || [],
    },
    evidencePaths: evidencePathList(queueRow),
  };
});

const screenClassificationCounts = screenGapRows.reduce((counts, row) => {
  const classification = row.honestClassification.historicalClassification;
  counts[classification] = (counts[classification] || 0) + 1;
  return counts;
}, {});

const screenGapMatrix = {
  schemaVersion: 1,
  reportId: `MASTER_131_SCREEN_GAP_MATRIX_${reportDate}`,
  generatedAt,
  status: 'RECONCILIATION_EVIDENCE_ONLY',
  decision: 'No screen repair, Figma fetch, recapture, snapshot update, or parity closure was performed in this goal.',
  canonical: {
    fileKey: canonicalFigmaFileKey,
    forbiddenFileKey: forbiddenFigmaFileKey,
    screenCount: screenGapRows.length,
    approvedLocales,
    excludedLocales,
    noMasksCropsOverlaysHiddenRegionsOrAntiAliasMasks: true,
    runtimeSnapshotsDoNotProveFigmaParity: true,
  },
  baseline: {
    source: 'agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_REPORT_2026-08-30.json',
    processed: precommitReport.scope?.queue?.processed ?? queue.counts?.processed ?? null,
    pending: precommitReport.scope?.queue?.pending ?? queue.counts?.pending ?? null,
    closureEligible: precommitReport.scope?.queue?.closureEligible ?? 102,
    notClosed: precommitReport.scope?.queue?.notClosed ?? 29,
    classifications: precommitReport.screenReconciliation?.classifications || queue.counts || screenClassificationCounts,
    finalDecision: finalReport.decision || null,
  },
  surfaceCounts,
  directVerification: {
    authenticatedCanonicalAccessAvailableInThisGoal: false,
    exceptionIds: [...externalExceptionIds],
    exceptionCount: externalExceptionIds.size,
    verifiedNow: [],
    historicalEvidenceReused: true,
    reason: 'No Figma connector/authenticated retrieval was available or invoked; existing queue/source evidence is preserved without a new parity claim.',
  },
  statusSemantics: {
    regressionStatus: 'Deterministic runtime evidence only.',
    figmaParityStatus: 'Requires authenticated direct canonical review and transparent metrics.',
    externalExceptionStatus: 'Open until exact approved source/contract/fixture is available and directly reviewed.',
  },
  screens: screenGapRows,
};
writeJson(`agent_pack/08_reality_sync/MASTER_131_SCREEN_GAP_MATRIX_${reportDate}.json`, screenGapMatrix);

const apiStatusCounts = apiRows.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] || 0) + 1;
  return counts;
}, {});
const plannedApiRows = apiRows.filter((row) => row.status === 'planned');
const routeShape = (route) => String(route || '').replaceAll(/:[^/]+/gu, ':param');
const screenRouteMatches = (apiPath) => screenGapRows.filter((screen) => screen.canonicalRoute && routeShape(screen.canonicalRoute) === routeShape(apiPath)).map((screen) => screen.screenId);
const apiArea = (row) => {
  const route = row.path || '';
  if (route.includes('/auth/')) return 'AUTHENTICATION_BOUNDARY';
  if (route.includes('/public/')) return 'PUBLIC_READ_OR_REQUEST';
  if (route.includes('/provider/')) return 'PROVIDER_SCOPE';
  if (route.includes('/seeker/')) return 'SEEKER_SCOPE';
  if (route.includes('/admin/')) return 'ADMIN_SCOPE';
  return row.module || 'PLATFORM';
};
const apiGapRows = apiRows.map((row, index) => {
  const implemented = row.status === 'implemented';
  const method = String(row.method || '').toUpperCase();
  const pathValue = row.path || null;
  const listLike = method === 'GET' && !String(pathValue).match(/:[^/]+$/u);
  return {
    sequence: index + 1,
    method,
    path: pathValue,
    module: row.module || null,
    apiVersion: row.apiVersion || null,
    blueprintStatus: row.status || null,
    runtimeStatus: implemented ? 'IMPLEMENTED_RUNTIME' : 'NOT_IMPLEMENTED_PLANNED',
    requirementDecision: implemented ? 'IMPLEMENTED_RUNTIME' : 'PENDING_G4_REVALIDATION',
    requirementDecisionOptions: implemented ? [] : ['REQUIRED', 'RETIRED', 'BLOCKED_PRODUCT'],
    requirementEvidence: implemented
      ? ['API_ENDPOINT_BLUEPRINT.status=implemented', 'PRE_COMMIT_RELEASE_AUDIT_REPORT_2026-08-30.apiReconciliation.currentTruth']
      : ['API_ENDPOINT_BLUEPRINT.status=planned', 'backend_157 must revalidate active product requirement before implementation or retirement'],
    productArea: apiArea(row),
    purpose: row.purpose || null,
    screenConsumer: {
      boundScreenIds: screenRouteMatches(pathValue),
      status: screenRouteMatches(pathValue).length > 0 ? 'ROUTE_SHAPE_MATCH' : 'NOT_EXPLICITLY_BOUND_IN_CURRENT_BLUEPRINT',
    },
    auth: {
      mode: row.auth || null,
      roles: row.roles || [],
      boundaryNote: pathValue?.includes('/auth/') ? 'Preserve email-only OTP for Seeker/Provider and Admin email/password; no phone fallback.' : 'Preserve server-side subject and role derivation.',
    },
    validation: implemented ? 'PER_ROUTE_SCHEMA_NOT_ENUMERATED_IN_BLUEPRINT; inspect owning contract/tests in G4.' : 'REQUIRED_BEFORE_CONTRACT_FREEZE',
    serverDerivedFields: ['subject/ownership where applicable', 'relations and source metadata where applicable', 'status, assignment, audit fields and timestamps where applicable'],
    rateLimit: method === 'GET' ? 'PER_ROUTE_EVIDENCE_REQUIRED_IN_G4; current process-local limitation is documented globally.' : 'CURRENT_PROCESS_LOCAL_OR_UNSPECIFIED; shared Mongo-backed limiter required for production.',
    idorAndRbac: row.auth === 'none' ? 'Public boundary; safe projection and enumeration review required.' : 'Role/ownership matrix and negative IDOR tests required in G4.',
    projection: 'Allowlisted response projection required; no internal IDs, credentials, PII or storage internals unless explicitly authorized.',
    pagination: listLike ? 'Bounded pagination and allowlisted sort/filter required; per-route evidence not enumerated here.' : 'Not applicable or must be proven from route semantics; no unbounded query assumption is allowed.',
    indexEvidence: 'Explain-backed compound index evidence is not captured in the current blueprint and remains a G4 gap.',
    idempotency: method !== 'GET' ? 'Assess retry/idempotency semantics in G4; PUB-03 must use Idempotency-Key.' : 'Not applicable unless the route triggers a side effect.',
    tests: implemented ? 'Global unit/integration/API/security gates are recorded; per-route coverage must be traced in G4.' : 'No runtime test may be invented before requirement decision.',
    openapi: 'Global validator passed in pre-commit evidence; per-route decision/contract must stay synchronized.',
    postman: 'Global validator passed in pre-commit evidence; per-route decision/contract must stay synchronized.',
    boundAtomicTask: implemented ? 'backend_157' : 'backend_157',
    migrationImpact: implemented ? 'No migration assigned by this reconciliation.' : 'Decision may require a backward-compatible route/schema change; dry-run and rollback proof required.',
    currentGap: implemented ? 'No new per-route defect claim; hardening evidence remains task-owned.' : 'Planned route must be revalidated before implementation, retirement or blocking decision.',
    riskFlags: [
      ...(implemented ? [] : ['planned_route']),
      ...(method !== 'GET' ? ['write_or_mutation_boundary'] : []),
      ...(listLike ? ['pagination_and_query_scale'] : []),
    ],
  };
});

const expectedAbsentCandidates = [
  ['POST', '/api/v1/public/property-requests', 'PUB-03 persisted-first request entry', 'backend_152'],
  ['GET', '/api/v1/admin/requests', 'Sales/Admin request list', 'backend_155'],
  ['GET', '/api/v1/admin/requests/:publicReference', 'Sales/Admin request detail', 'backend_155'],
  ['POST', '/api/v1/admin/requests/:publicReference/assign', 'Manager reassignment', 'backend_154'],
  ['POST', '/api/v1/admin/requests/:publicReference/notes', 'Request notes', 'backend_155'],
  ['POST', '/api/v1/admin/requests/:publicReference/transitions', 'Request status transition', 'backend_155'],
  ['POST', '/api/v1/admin/requests/:publicReference/privacy-actions', 'Anonymization/deletion workflow', 'backend_155'],
  ['GET', '/api/v1/admin/sales-teams', 'Sales team scope', 'backend_154'],
  ['POST', '/api/v1/admin/sales-teams', 'Sales team creation', 'backend_154'],
  ['PATCH', '/api/v1/admin/sales-teams/:teamId', 'Sales team update', 'backend_154'],
  ['GET', '/api/v1/admin/sales-agents/capacity', 'Sales capacity view', 'backend_154'],
  ['PATCH', '/api/v1/admin/sales-agents/:agentId/capacity', 'Sales capacity update', 'backend_154'],
];
const expectedButAbsent = expectedAbsentCandidates.map(([method, route, purpose, taskId]) => {
  const existing = apiRows.find((row) => row.method === method && row.path === route);
  return {
    method,
    path: route,
    purpose,
    requiredAtomicTask: taskId,
    currentStatus: existing ? 'PRESENT_IN_187_BLUEPRINT' : 'ABSENT_FROM_187_BLUEPRINT',
    blueprintStatus: existing?.status || null,
    contractFreeze: route.includes('property-requests') ? 'blocked until contact-time mapping and privacy disclosure approval' : 'task-owned contract decision required',
  };
});

const apiDatabaseRuntimeMatrix = {
  schemaVersion: 1,
  reportId: `API_DATABASE_RUNTIME_GAP_MATRIX_${reportDate}`,
  generatedAt,
  status: 'RECONCILIATION_EVIDENCE_ONLY',
  baseline: {
    blueprintTotal: apiRows.length,
    statusCounts: apiStatusCounts,
    implementedRuntime: 178,
    planned: 9,
    runtimeRoutes: 178,
    apiAuditErrors: 0,
    source: 'agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_REPORT_2026-08-30.json',
  },
  decisionSemantics: {
    implemented: 'IMPLEMENTED_RUNTIME is a current baseline state, not a new review.',
    planned: 'PENDING_G4_REVALIDATION is intentionally not REQUIRED, RETIRED, or BLOCKED_PRODUCT until active product evidence is reviewed.',
    noDeadRouteRule: 'RETIRED entries must not gain runtime routes merely to reach planned=0.',
  },
  exactPlannedRoutes: plannedApiRows.map((row) => ({
    method: row.method,
    path: row.path,
    module: row.module,
    auth: row.auth,
    roles: row.roles,
    purpose: row.purpose,
    currentDecision: 'PENDING_G4_REVALIDATION',
    requiredAtomicTask: 'backend_157',
  })),
  expectedButAbsent,
  productRequirementAreas: {
    pub03: {
      route: 'POST /api/v1/public/property-requests',
      status: expectedButAbsent.find((row) => row.path === '/api/v1/public/property-requests')?.currentStatus,
      requirements: ['approved preferredContactTime AR/EN mapping', 'approved non-disruptive privacy disclosure before privacyNoticeVersion', 'Mongo transaction', 'opaque UUID publicReference', 'persist before WhatsApp'],
      nextTask: 'backend_152',
    },
    salesCrm: { status: 'NOT_IN_CURRENT_187_ROUTE_BASELINE', nextTask: 'backend_154/backend_155', requirement: 'one primary owner or QUEUED_UNASSIGNED; scoped RBAC and audit' },
    whatsapp: { status: 'NOT_IN_CURRENT_187_ROUTE_BASELINE', nextTask: 'backend_156', requirement: 'handoff only after successful persistence; failure retains request' },
    emailOnlyAuth: { status: 'CURRENT_POLICY_CONFIRMED', requirement: 'Seeker/Provider email-only OTP; Admin email/password; no phone fallback' },
    phoneAuthRedirect: { status: 'CURRENT_FRONTEND_POLICY', requirement: 'Phone aliases redirect to email verification route; phone is not an auth identifier' },
    mapUrl: { status: 'CURRENT_POLICY_CONFIRMED', requirement: 'Stored absolute HTTPS URL only; server does not synthesize/geocode' },
    adminEmailPassword: { status: 'CURRENT_POLICY_CONFIRMED', requirement: 'Admin-only Argon2id password boundary remains separate' },
    smtp: { status: 'EXTERNAL_PRODUCTION_PREREQUISITE', nextTask: 'backend_159', requirement: 'Hostinger TLS config, local catcher, staging smoke, DNS checks, fail-closed readiness' },
    passwordReset: { status: 'PLANNED_REQUIRES_PRODUCT_DECISION', affectedRoutes: ['/api/v1/auth/password/forgot', '/api/v1/auth/password/reset'] },
    broadReads: { status: 'KNOWN_HARDENING_GAP', nextTask: 'backend_157' },
    processLocalLimiter: { status: 'KNOWN_PRODUCTION_GAP', nextTask: 'backend_157', requirement: 'Mongo-backed shared rate limiting' },
    topologyAndBackup: { status: 'EXTERNAL_INFRASTRUCTURE_PREREQUISITE', nextTask: 'backend_158/backend_159' },
  },
  rows: apiGapRows,
};
writeJson(`agent_pack/08_reality_sync/API_DATABASE_RUNTIME_GAP_MATRIX_${reportDate}.json`, apiDatabaseRuntimeMatrix);

const textExtensions = new Set(['.md', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.scss', '.html', '.yml', '.yaml', '.txt', '.csv', '.sql', '.prisma', '.xml', '.sh', '.ps1']);
const ignoredDirectoryNames = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'test-results', 'playwright-report', '.local']);
const collectTextFiles = (directory) => {
  const result = [];
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...collectTextFiles(absolute));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase()) && !/^\.env(?:\.|$)/u.test(entry.name)) result.push(absolute);
  }
  return result;
};
const textRoots = ['agent_pack', 'apps', 'packages', 'scripts', 'docs'].map((item) => path.join(root, item));
const localeScanFiles = textRoots.flatMap(collectTextFiles).filter((absolute) => {
  const filePath = relative(absolute);
  return !(filePath.startsWith('agent_pack/08_reality_sync/') && filePath.includes(reportDate))
    && filePath !== `docs/quality/figma_parity/MASTER_131_SCREEN_GAP_REPORT_${reportDate}.md`;
});
const localeOccurrences = [];
const localeFilenameOccurrences = [];
const englishSafeSnippet = (line) => line.trim().replace(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/gu, '[NON_ENGLISH_TEXT_REDACTED]').slice(0, 240);
for (const absolute of localeScanFiles) {
  const filePath = relative(absolute);
  if (/zh-CN|zh_CN|zhCN/iu.test(path.basename(filePath))) localeFilenameOccurrences.push(filePath);
  let content;
  try { content = fs.readFileSync(absolute, 'utf8'); } catch { continue; }
  const lines = content.split(/\r?\n/u);
  lines.forEach((line, lineIndex) => {
    const matcher = /zh-CN/gu;
    let match;
    while ((match = matcher.exec(line)) !== null) {
      let category = 'HISTORICAL_OR_EVIDENCE_METADATA';
      if (/^(apps|packages)\//u.test(filePath)) category = 'ACTIVE_RUNTIME_OR_CONTRACT_REVIEW';
      else if (/\/tests?\/|snapshot|fixture/iu.test(filePath)) category = 'TEST_OR_SNAPSHOT_REVIEW';
      else if (/schema|migration|seed|index/iu.test(filePath)) category = 'DATABASE_OR_MIGRATION_REVIEW';
      localeOccurrences.push({
        path: filePath,
        line: lineIndex + 1,
        column: match.index + 1,
        value: 'zh-CN',
        category,
        snippet: englishSafeSnippet(line),
      });
    }
  });
}
const localeByCategory = localeOccurrences.reduce((counts, occurrence) => {
  counts[occurrence.category] = (counts[occurrence.category] || 0) + 1;
  return counts;
}, {});
const retiredLocaleInventory = {
  schemaVersion: 1,
  reportId: `RETIRED_LOCALE_INVENTORY_${reportDate}`,
  generatedAt,
  retiredLocales: excludedLocales,
  activeLocales: approvedLocales,
  searchPatterns: ['zh-CN', 'zh_CN', 'zhCN'],
  scanScope: ['contracts', 'API source', 'database schema/indexes/migrations', 'UI/source/routes/copy', 'seeds', 'tests', 'snapshots', 'docs', 'Agent Pack', 'text filenames'],
  textFileCountScanned: localeScanFiles.length,
  occurrenceCount: localeOccurrences.length,
  occurrenceCountsByCategory: localeByCategory,
  filenameOccurrences: localeFilenameOccurrences,
  occurrences: localeOccurrences,
  databaseDryRun: {
    status: 'NOT_RUN',
    reason: 'local:status reported stopped; this reconciliation did not start MongoDB, seed data, or read a database.',
    requiredNextTask: 'backend_150',
    commandForNextTask: 'Read-only isolated Mongo dry-run with no apply flag; exact URI must remain outside reports.',
  },
  migrationRules: {
    recordsWithArOrEn: 'report counts before apply; do not translate automatically',
    recordsWithRetiredLocaleAndArOrEn: 'unset only after backup, restore proof, dry-run and explicit approval',
    recordsWithRetiredLocaleOnly: 'block apply; no fabricated translation',
    retiredPreferredLocale: 'migrate to canonical ar only after approved dry-run and count verification',
    textIndexes: 'rebuild using ar/en only after approved migration',
  },
  separateApprovalGates: [
    'active source/contract/runtime removal',
    'database field/index/preferred-locale migration',
    'test/fixture/runtime-snapshot removal',
    'Agent Pack/docs sanitization while preserving historical truth',
    'retired visual artifact deletion',
    'AR/EN image-only Git index untracking',
    'optional history rewrite/LFS migration',
  ],
  deletionPerformed: false,
  imageDeletionPerformed: false,
  sourceDeletionPerformed: false,
  databaseApplyPerformed: false,
  restoreProofRequiredBeforeAnyApply: true,
};
writeJson(`agent_pack/08_reality_sync/RETIRED_LOCALE_INVENTORY_${reportDate}.json`, retiredLocaleInventory);

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.avif']);
const gitTrackedPaths = commandOutput('git', ['ls-files', '-z', 'docs/design_sources/final_screens', 'docs/quality'])?.split('\0').filter(Boolean) || [];
const targetImagePaths = gitTrackedPaths.filter((filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));
const excludedImagePaths = collectTextFiles(path.join(root, 'docs/design_sources')).length >= 0
  ? fs.readdirSync(path.join(root, 'docs/design_sources'), { withFileTypes: true }).length >= 0
    ? (() => {
      const result = [];
      const walk = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          const absolute = path.join(directory, entry.name);
          if (entry.isDirectory()) walk(absolute);
          else if (imageExtensions.has(path.extname(entry.name).toLowerCase()) && !relative(absolute).startsWith('docs/design_sources/final_screens/')) result.push(relative(absolute));
        }
      };
      walk(path.join(root, 'docs/design_sources'));
      return result;
    })()
    : []
  : [];

const pngDimensions = (buffer) => buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.toString('ascii', 1, 4) === 'PNG'
  ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : null;
const webpDimensions = (buffer) => {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return null;
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
};
const jpegDimensions = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (marker >= 0xc0 && marker <= 0xc3 && offset + 7 <= buffer.length) return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    if (segmentLength < 2) break;
    offset += segmentLength;
  }
  return null;
};
const imageDimensions = (buffer, extension) => pngDimensions(buffer) || webpDimensions(buffer) || (extension === '.jpg' || extension === '.jpeg' ? jpegDimensions(buffer) : null);
const sourceByLocalPath = new Map();
for (const row of designRows) for (const source of safeArray(row.localSources)) if (source.localPath) sourceByLocalPath.set(source.localPath.replaceAll('\\', '/'), { row, source });
const queueIdByEvidenceDir = new Map(queueRows.filter((row) => row.evidenceDir).map((row) => [row.evidenceDir.replaceAll('\\', '/'), row.screenId]));
const imageEntries = targetImagePaths.sort().map((filePath) => {
  const absolute = path.join(root, filePath);
  const buffer = fs.readFileSync(absolute);
  const extension = path.extname(filePath).toLowerCase();
  const sourceRecord = sourceByLocalPath.get(filePath);
  const pathParts = filePath.split('/');
  const screenId = sourceRecord?.row?.id || pathParts.find((part) => /^[A-Z]+-\d+(?:-\d+)?(?:\.owner-authored)?$/u.test(part.replace(/\.[^.]+$/u, ''))) || path.basename(filePath).match(/^(PUB|AUTH|SEK|PRV|ADM)-\d+(?:-\d+)?/u)?.[0] || null;
  const queueRow = screenId ? queueById.get(screenId) : null;
  const dimensions = imageDimensions(buffer, extension);
  let sourceType = 'OWNER_BASELINE_OR_HISTORICAL_EVIDENCE';
  if (filePath.startsWith('docs/design_sources/final_screens/')) sourceType = sourceRecord ? 'FIGMA_CANONICAL' : 'DESIGN_SOURCE_SCOPED_IMAGE';
  else if (/\/figma(?:\.|\/)/iu.test(filePath)) sourceType = 'FIGMA_CANONICAL_EVIDENCE';
  else if (/diff|metric/iu.test(filePath)) sourceType = 'RUNTIME_DIFF_OR_METRIC_EVIDENCE';
  else if (/runtime|snapshot|capture/iu.test(filePath)) sourceType = 'RUNTIME_REGRESSION_EVIDENCE';
  return {
    path: filePath,
    sha256: sha256Buffer(buffer),
    bytes: buffer.length,
    width: dimensions?.width ?? sourceRecord?.source?.width ?? null,
    height: dimensions?.height ?? sourceRecord?.source?.height ?? null,
    sourceType,
    figmaFileKey: sourceRecord?.source?.figmaFileKey || (queueRow?.clone?.fileKey === canonicalFigmaFileKey ? canonicalFigmaFileKey : null),
    nodeId: sourceRecord?.source?.figmaFrameNodeId || queueRow?.clone?.nodeId || null,
    screenId,
    capturedAt: sourceRecord?.source?.retrievedAt || 'NOT_RECORDED_IN_EXISTING_MANIFEST',
    provenance: sourceRecord
      ? 'DESIGN_SOURCE_MANIFEST.localSources'
      : queueRow
        ? `SCREEN_EXECUTION_QUEUE evidence for ${screenId}`
        : 'Tracked local documentation evidence; provenance requires owner confirmation before external publication.',
  };
});
const bundleVersion = `visual-evidence-${reportDate}-reconciliation-1`;
const bundlePayload = { schemaVersion: 1, bundleVersion, files: imageEntries };
const bundleSha256 = sha256Buffer(Buffer.from(JSON.stringify(bundlePayload), 'utf8'));
const visualEvidenceManifest = {
  schemaVersion: 1,
  bundleVersion,
  bundleSha256,
  generatedAt,
  artifactService: 'PENDING_OWNER_APPROVAL_READ_ONLY_HOSTINGER_VPS',
  publicationStatus: 'NOT_PUBLISHED_EXTERNAL_IN_THIS_GOAL',
  externalPreservation: {
    required: true,
    currentProof: 'NOT_AVAILABLE; no external upload or restore was attempted.',
    requiredBeforeImageUntracking: true,
    ciReadToken: 'MUST_BE_IN_SECRET_STORE; NEVER_IN_GIT_OR_AGENT_PACK',
    backupRestoreProof: 'REQUIRED_BEFORE_ANY_INDEX-ONLY_UNTRACKING_OR_DELETION',
  },
  freshCloneCi: {
    standardTestsDependOnHydratedFigmaImages: false,
    parityLaneMustRestoreAndVerifyBundle: true,
    currentProof: 'NOT_PERFORMED_IN_THIS_GOAL; owner/storage gate remains open.',
    requiredSequence: [
      'npm.cmd run visual-evidence:restore -- --version <bundleVersion>',
      'npm.cmd run visual-evidence:verify -- --version <bundleVersion>',
    ],
  },
  restoreVerifyContract: {
    restore: 'npm.cmd run visual-evidence:restore -- --version <bundleVersion>',
    verify: 'npm.cmd run visual-evidence:verify -- --version <bundleVersion>',
    inventory: 'npm.cmd run visual-evidence:inventory',
    deterministicFailure: 'Stop if bundle version, bundle SHA-256, file SHA-256, bytes, or dimensions differ.',
  },
  scope: {
    targetRoots: ['docs/design_sources/final_screens/**', 'docs/quality/**'],
    targetImageCount: imageEntries.length,
    targetBytes: imageEntries.reduce((sum, file) => sum + file.bytes, 0),
    excludedImagePaths,
    excludedCount: excludedImagePaths.length,
    excludedReason: 'Brand/runtime/recovery images are not part of the image-only target list.',
  },
  files: imageEntries,
};
writeJson(`agent_pack/08_reality_sync/VISUAL_EVIDENCE_MANIFEST_${reportDate}.json`, visualEvidenceManifest);

const imageInventory = {
  schemaVersion: 1,
  reportId: `DOCUMENTATION_IMAGE_ARTIFACT_INVENTORY_${reportDate}`,
  generatedAt,
  scope: {
    targetRoots: ['docs/design_sources/final_screens/**', 'docs/quality/**'],
    trackedImageCount: imageEntries.length,
    trackedImageBytes: imageEntries.reduce((sum, file) => sum + file.bytes, 0),
    trackedImageMiB: Number((imageEntries.reduce((sum, file) => sum + file.bytes, 0) / 1048576).toFixed(3)),
    byRoot: {
      design_sources_final_screens: {
        count: imageEntries.filter((file) => file.path.startsWith('docs/design_sources/final_screens/')).length,
        bytes: imageEntries.filter((file) => file.path.startsWith('docs/design_sources/final_screens/')).reduce((sum, file) => sum + file.bytes, 0),
      },
      quality: {
        count: imageEntries.filter((file) => file.path.startsWith('docs/quality/')).length,
        bytes: imageEntries.filter((file) => file.path.startsWith('docs/quality/')).reduce((sum, file) => sum + file.bytes, 0),
      },
    },
    nonTargetImages: excludedImagePaths.map((filePath) => ({ path: filePath, reason: filePath.includes('/brand/') ? 'brand asset' : 'recovery candidate or non-final source' })),
  },
  hashManifest: {
    path: `agent_pack/08_reality_sync/VISUAL_EVIDENCE_MANIFEST_${reportDate}.json`,
    bundleVersion,
    bundleSha256,
    includesSha256BytesDimensionsProvenance: true,
  },
  gitSizeSemantics: {
    ignoreAndIndexOnlyUntracking: 'Prevents future/current-tree index tracking but does not shrink existing Git history or old clone size.',
    historyReduction: 'Dormant optional procedure only; requires mirror backup, size reports, collaborator freeze, protected-branch approval, restore proof and explicit force-push authorization.',
  },
  destructiveActions: {
    indexUntrackingPerformed: false,
    deletionPerformed: false,
    exactTargetList: 'Use the hash manifest files list only after external publication and restore proof.',
    dryRunRequired: true,
    explicitApprovalRequired: true,
  },
};
writeJson(`agent_pack/08_reality_sync/DOCUMENTATION_IMAGE_ARTIFACT_INVENTORY_${reportDate}.json`, imageInventory);

const riskApprovalRollbackMatrix = {
  schemaVersion: 1,
  reportId: `MASTER_RISK_APPROVAL_ROLLBACK_MATRIX_${reportDate}`,
  generatedAt,
  status: 'GOVERNANCE_MATRIX_NOT_EXECUTION_AUTHORIZATION',
  rows: [
    { action: 'Dirty-tree overwrite', approval: 'No waiver', prevention: 'Per-file ownership/provenance manifest; stop on USER_OWNED or UNKNOWN overlap.', rollback: 'Stop; no mutation.' },
    { action: 'Image index-only untracking', approval: 'Explicit owner approval', prevention: 'External encrypted bundle, restore proof, exact hashed list and dry-run.', rollback: 'Exact target-list re-add before any commit; no broad glob.' },
    { action: 'Retired DB locale/index removal', approval: 'Explicit owner approval', prevention: 'Isolated backup/restore proof, dry-run counts, orphan block.', rollback: 'Restore collections and exact index definitions.' },
    { action: 'Active source locale removal', approval: 'Explicit approval', prevention: 'Exact occurrence manifest and AR/EN tests.', rollback: 'Restore exact approved files/patch.' },
    { action: 'Tests/snapshots deletion', approval: 'Separate explicit approval', prevention: 'Hash inventory and replacement AR/EN coverage.', rollback: 'Restore exact artifacts.' },
    { action: 'Retired visual deletion', approval: 'Separate explicit approval', prevention: 'External encrypted bundle and exact target hashes.', rollback: 'Deterministic bundle restore.' },
    { action: 'Vault key rotation', approval: 'Security/owner approval', prevention: 'Versioned keys, dual-read, checkpointed rewrap/re-index and counts.', rollback: 'Keep previous key read path active.' },
    { action: 'Privacy anonymize/delete', approval: 'Privileged case approval and legal-hold check', prevention: 'Data-subject verification, reason, actor and audit.', rollback: 'Anonymization is generally irreversible; restore only on legal-owner direction.' },
    { action: 'Live SMTP send', approval: 'Separate staging/production approval', prevention: 'Controlled inbox, no OTP/PII, DNS checks, fail-closed readiness.', rollback: 'Previous config/release; no phone fallback.' },
    { action: 'Production migration', approval: 'Deployment approval', prevention: 'Replica-set backup, dry-run, compatibility and restore proof.', rollback: 'Backward-compatible release and restore.' },
    { action: 'Snapshot update', approval: 'Direct canonical reviewer approval', prevention: 'Old/new hashes, direct Figma review and no-update follow-up.', rollback: 'Restore exact prior snapshot.' },
    { action: 'External artifact service loss', approval: 'Operations owner', prevention: 'Separate encrypted backup and restore drill.', rollback: 'Restore exact bundle/service.' },
    { action: 'Single-VPS root compromise', approval: 'Security acceptance', prevention: 'Least privilege, loopback Vault, off-host unseal shares and monitoring.', rollback: 'Isolate VPS, rotate secrets, restore clean host.' },
    { action: 'History rewrite/LFS/force push', approval: 'Extraordinary explicit authorization', prevention: 'Mirror backup, refs/size reports, disposable dry-run, collaborator coordination and fresh-clone proof.', rollback: 'Restore mirror refs/remote.' },
    { action: 'Commit/push/deploy', approval: 'Separate human authorization', prevention: 'Reviewed atomic commit plan; no operation in G1-G6 reconciliation.', rollback: 'Provider-specific release rollback.' },
  ],
};
writeJson(`agent_pack/08_reality_sync/MASTER_RISK_APPROVAL_ROLLBACK_MATRIX_${reportDate}.json`, riskApprovalRollbackMatrix);

const localPreviewHandoff = `# Live Preview Handoff — ${reportDate}\n\n## Coordinator observation\n\nThe coordinator ran only the safe diagnostic commands below. The local supervisor is stopped; no application process, MongoDB target, seed, email catcher, or generated environment file was started or changed by this reconciliation.\n\n| Command | Exit code | Observed result |\n| --- | ---: | --- |\n| \`node --version\` | 0 | \`v24.19.0\` |\n| \`npm.cmd --version\` | 0 | \`11.6.4\` |\n| \`npm.cmd run local:check\` | 0 | \`LOCAL_DOCTOR_OK\`; Node 24, npm, external Mongo target 127.0.0.1:27018, ports and dependencies ready |\n| \`npm.cmd run local:status\` | 1 | \`LOCAL_STATUS stopped ready=false\` |\n\n## Owner startup sequence\n\nRun this exact sequence only when the owner authorizes a local preview start:\n\n\`\`\`powershell\nnpm.cmd ci\nnpm.cmd run local:prepare\nnpm.cmd run local:check\nnpm.cmd run local:up\nnpm.cmd run local:smoke\n\`\`\`\n\nThe owner must record the visible state after each command. The coordinator did not run this sequence because the current goal forbids starting/seed operations.\n\n## Preview URLs\n\n- Platform: http://localhost:8080\n- Captured OTP inbox: http://localhost:8025\n\n## Safe data and login references\n\n- Local-only seed and login behavior: [docs/deployment/LOCAL_PREVIEW.md](../../docs/deployment/LOCAL_PREVIEW.md)\n- Synthetic fixture boundary: [docs/api/uat-fixtures.md](../../docs/api/uat-fixtures.md)\n- Auth boundary: [docs/api/authentication.md](../../docs/api/authentication.md)\n- Never copy local credentials, OTPs, Mongo URIs, or generated environment values into Git, Agent Pack, logs, screenshots, or this handoff.\n\n## Topology and recovery prerequisites\n\n- Supply a non-production external \`MONGODB_URI\`; the repository does not download or start MongoDB.\n- Transactions and request workflows require a replica-set-capable isolated target.\n- Production readiness additionally requires the approved Mongo replica-set, encrypted Mongo backups, separate Vault snapshot/key custody, external visual bundle backup, suppression/deletion ledger replay, malware scanning, private storage, observability, and Hostinger SMTP/DNS validation.\n\n## Logs and stop\n\n- Inspect repository-owned startup output with \`npm.cmd run local:logs\`.\n- Stop only repository-owned child processes with \`npm.cmd run local:down\`.\n- Re-run \`npm.cmd run local:status\` after stopping.\n- Do not delete \`.local\`, reset Git, or remove external Mongo data as part of routine stop.\n\n## Current handoff state\n\n\`LIVE_PREVIEW_STOPPED_OWNER_START_REQUIRED\`\n`;
writeText(`agent_pack/08_reality_sync/LIVE_PREVIEW_HANDOFF_${reportDate}.md`, localPreviewHandoff);

const nextTaskGoal = `# Copy-Ready Luna Goal — backend_150\n\n## Objective\n\nInventory every retired-locale occurrence and produce a dry-run-only migration design with exact targets, orphan handling, backup requirements, and rollback proof. Do not change database data, indexes, source, tests, snapshots, images, Git index, or external services.\n\n## Dependencies and readiness gate\n\n- Active program: \`${activeProgramId}\`.\n- Predecessor: \`frontend_106\` must remain \`complete\`.\n- The current selector chose \`backend_150\` as the first open dependency-ready task.\n- Read the current Goal/objective, \`RUN_CHECKPOINT.json\`, \`TASK_STATE.json\`, \`TASK_CATALOG.json\`, active registry, ownership manifest, and this file.\n- The Mongo target must be an isolated, non-production, replica-set-capable environment supplied outside Git.\n- If a target path is USER_OWNED, UNKNOWN, outside the allowed roots, or overlaps unrelated work, emit \`TASK_backend_150_BLOCKED_OWNERSHIP\` and stop.\n\n## Exact allowed paths\n\n- \`agent_pack/03_execution/**\` for additive checkpoint/state evidence only.\n- \`agent_pack/04_tracks/backend/G1_repository_rebaseline/backend_150.md\`.\n- \`agent_pack/07_finish/backend_150/**\` only if task-local evidence is required.\n- \`agent_pack/08_reality_sync/BACKEND_150_RETIRED_LOCALE_INVENTORY_2026-08-30.json\` and an additive dated superseding report.\n- \`agent_pack/scripts/**\` only for bounded read-only inventory tooling owned by this task.\n\n## Forbidden paths and actions\n\n- Product/runtime files under \`apps/**\`, \`packages/**\`, \`scripts/**\`, and all visual/source files.\n- \`.env*\`, secrets, credentials, \`.local/**\`, \`node_modules/**\`, build/output directories, and production Mongo.\n- Active locale deletion, translation, index removal, image deletion, Git index changes, history rewrite, or external upload.\n- \`git clean\`, reset, revert, stash, checkout-discard, broad deletion, commit, push, deploy, force push, or nested agents.\n\n## Implementation requirements\n\n1. Run a read-only inventory for \`zh-CN\`/retired-locale variants across contracts, API source, DB schema/indexes/migrations, UI/routes/copy, seeds, tests, snapshots, docs, Agent Pack and filenames.\n2. Run a Mongo dry-run only. Report counts for records with valid AR/EN, retired locale plus AR/EN, retired locale only, and retired preferred locale.\n3. Any record without AR or EN is a hard apply blocker; never auto-translate or fabricate.\n4. Produce exact target manifests for source, DB fields/indexes, tests/snapshots, docs/Agent Pack and visual artifacts. Do not delete any target.\n5. Record the separate approvals required for DB apply, source removal, tests/snapshots, visual deletion, image-only untracking, and optional history reduction.\n6. Preserve historical Agent Pack statuses and use \`RETIRED_LOCALE\` only for active sanitized truth after approval.\n\n## Database/migration and rollback\n\n- This task is dry-run only; no apply flag and no production connection.\n- Record collection/index names, before counts, projected changes, orphan counts, checkpoint, and exact restore command.\n- Backup and restore proof must precede any future DB apply task.\n- Rollback is restoration of the exact isolated backup and index definitions; no broad reset or discard.\n\n## Focused verification\n\n\`\`\`powershell\ngit status --short\ngit diff --check\nnpm.cmd run locale:audit\nnode agent_pack/scripts/audit_pack.mjs\n\`\`\`\n\nUse only the approved isolated read-only Mongo dry-run command recorded in the task evidence. Do not run full product builds, migrations, snapshot updates, or Live Preview startup in this task.\n\n## Evidence and Agent Pack updates\n\nRecord command/exit-code output, exact occurrence paths, Mongo counts/index definitions, backup/restore proof or blocker, ownership decisions, and unresolved approvals. Update only the task-local evidence, checkpoint, dependency/state record, and Finish Index entry for this task. Run sync and audit; retain historical entries.\n\n## Markers and stop\n\nSuccess: \`TASK_backend_150_COMPLETE\` only when the read-only inventory and dry-run evidence are complete.\n\nBlocked: \`TASK_backend_150_BLOCKED_DEPENDENCY\`, \`TASK_backend_150_BLOCKED_APPROVAL\`, \`TASK_backend_150_BLOCKED_OWNERSHIP\`, \`TASK_backend_150_BLOCKED_EXTERNAL\`, or \`TASK_backend_150_BLOCKED_VERIFICATION\`.\n\nAfter one marker and a concise handoff, stop completely. Do not select, create, or start another task. No nested agents.\n`;
writeText(`agent_pack/08_reality_sync/NEXT_TASK_LUNA_GOAL_BACKEND_150_${reportDate}.md`, nextTaskGoal);

const runner = `# Active One-Task Luna Runner — Sadat Real Estate\n\nExecute exactly one dependency-ready active Agent Pack task: \`{{TASK_ID}}\`. Stop after that task.\n\n## Preconditions\n\n1. Read the current Codex Goal/objective, active registry, latest checkpoint, task catalog/state/dependencies/atomic map, ownership manifest, current-state reports, and \`{{TASK_ID}}\` task file.\n2. Run read-only preflight:\n\n\`\`\`powershell\npwd\ngit status --short\ngit status -sb\ngit diff --check\ngit rev-list --left-right --count HEAD...origin/main\ngit log -1 --format="%H %s"\ngit worktree list --porcelain\n\`\`\`\n\n3. Treat the working tree as protected and potentially dirty regardless of output.\n4. Verify \`{{TASK_ID}}\` is in \`${activeProgramId}\`, all dependencies are complete, and required approvals/evidence exist.\n5. Resolve every write path against the current ownership manifest. If a path is USER_OWNED, UNKNOWN, outside the task allowlist, or overlaps unrelated work, emit \`TASK_{{TASK_ID}}_BLOCKED_OWNERSHIP\` and stop without mutation.\n\n## Allowed and forbidden boundary\n\n- Use only exact paths and target lists recorded in \`{{TASK_ID}}\`. Read elsewhere only for verification.\n- Never edit \`.git/**\`, \`.env*\`, secrets, credentials, \`.local/**\`, build outputs, runtime evidence outputs, or user-owned/unrelated files.\n- Never use the forbidden Figma file \`${forbiddenFigmaFileKey}\`.\n- Never use \`git clean\`, reset, revert, stash, checkout-discard, broad deletion, commit, push, deploy, force push, history rewrite, snapshot ignore/update flags, masks, crops, overlays, hidden regions, or anti-alias masks.\n- No nested agents unless explicitly authorized.\n\n## Execution\n\n1. Execute only the bounded objective in \`{{TASK_ID}}\`.\n2. Destructive, database, index, external-send, or external-storage tasks require their own approval token, exact target list, hashes, dry-run, backup, and restore proof before action.\n3. Preserve compatibility until verification passes. Treat sourceRoute, referrer, attribution, relations, assignment, status, audit fields, timestamps, and other sensitive metadata as server-derived or allowlisted.\n4. Do not invent \`preferredContactTime\`; do not add \`consentAt\`; do not expose Mongo ObjectId as a public request reference. Keep Seeker/Provider email-only OTP and Admin email/password boundaries.\n5. Keep runtime regression evidence separate from canonical Figma parity evidence.\n\n## Verification and evidence\n\nRun only task-focused checks, affected typecheck/lint/contract tests, and \`git diff --check\`. For database/API changes record before/after counts, indexes, versions and rollback command. For UI/Figma changes use AR/EN functional/accessibility checks, verified canonical source \`${canonicalFigmaFileKey}\`, transparent full-canvas metrics and direct review; never use snapshots as parity proof. Runtime snapshots, if task-owned and approved, use no-update follow-up.\n\nUpdate only the task file, task-local evidence, checkpoint/dependencies/state/Finish Index and approved reports. Preserve historical records. Run:\n\n\`\`\`powershell\nnode agent_pack/scripts/sync_pack.mjs\nnode agent_pack/scripts/audit_pack.mjs\ngit diff --check\n\`\`\`\n\n## Markers and stop\n\nSuccess: \`TASK_{{TASK_ID}}_COMPLETE\`.\n\nBlocked: \`TASK_{{TASK_ID}}_BLOCKED_DEPENDENCY\`, \`TASK_{{TASK_ID}}_BLOCKED_APPROVAL\`, \`TASK_{{TASK_ID}}_BLOCKED_OWNERSHIP\`, \`TASK_{{TASK_ID}}_BLOCKED_EXTERNAL\`, or \`TASK_{{TASK_ID}}_BLOCKED_VERIFICATION\`.\n\nEmit one marker and concise handoff, then stop. Do not select, create, or start the next task.\n`;
writeText(`agent_pack/08_reality_sync/ACTIVE_ONE_TASK_LUNA_RUNNER_${reportDate}.md`, runner);

const taskValues = Object.values(taskState.tasks || {});
const statusCounts = taskValues.reduce((counts, task) => {
  counts[task.status] = (counts[task.status] || 0) + 1;
  return counts;
}, {});
const activeStatusCounts = activeTaskIds.reduce((counts, id) => {
  const status = taskState.tasks[id]?.status || 'missing';
  counts[status] = (counts[status] || 0) + 1;
  return counts;
}, {});
const gitStatus = commandOutput('git', ['status', '--short']) || '';
const currentHead = commandOutput('git', ['rev-parse', 'HEAD']);
const divergence = commandOutput('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/main']);
const masterTruthReport = {
  schemaVersion: 1,
  reportId: `MASTER_REALITY_RECONCILIATION_${reportDate}`,
  generatedAt,
  finalMarker: 'MASTER_REALITY_RECONCILED_ACTIVE_PROGRAM_READY',
  decision: 'ACTIVE_PROGRAM_REGISTERED_AND_EVIDENCE_RECONCILED; NO PRODUCT TASK STARTED',
  protectedPreflight: {
    head: currentHead,
    upstream: 'origin/main',
    divergence,
    branch: 'main',
    ownershipManifestPath: ownershipManifestRelativePath,
    ownershipManifestSha256: sha256File(path.join(root, ownershipManifestRelativePath)),
    ownershipCorrectionPath: ownershipCorrectionRelativePath,
    workingTreePolicy: 'Protected/potentially dirty; existing user work is preserved.',
    currentStatusLines: gitStatus.split(/\r?\n/u).filter(Boolean),
    noMutationScope: ['product code', 'databases', 'documentation images', 'runtime snapshots', 'Git index', 'commits', 'pushes', 'deployments', 'history'],
  },
  agentPackTruth: {
    activeProgramId,
    activeTaskCount: activeTaskIds.length,
    historicalTaskCount: taskCatalog.length - activeTaskIds.length,
    taskCatalogTotal: taskCatalog.length,
    taskStatusCounts: statusCounts,
    activeStatusCounts,
    frontend106Status: taskState.tasks.frontend_106?.status || null,
    nextDependencyReadyTask: stepInfo?.selectedTaskId || 'backend_150',
    nextTaskFile: stepInfo?.selectedTaskFile || '04_tracks/backend/G1_repository_rebaseline/backend_150.md',
    noTaskStarted: true,
    historicalSelectorExcluded: ['frontend_099', 'frontend_103'],
  },
  screens: {
    total: screenGapRows.length,
    surfaces: surfaceCounts,
    closureEligible: screenGapMatrix.baseline.closureEligible,
    externalOrSourceExceptions: externalExceptionIds.size,
    classifications: screenGapMatrix.baseline.classifications,
    canonicalFigmaFileKey,
    forbiddenFigmaFileKey,
    approvedLocales,
    excludedLocales,
    matrixPath: `agent_pack/08_reality_sync/MASTER_131_SCREEN_GAP_MATRIX_${reportDate}.json`,
    arabicReportPath: `docs/quality/figma_parity/MASTER_131_SCREEN_GAP_REPORT_${reportDate}.md`,
    directReviewInThisGoal: false,
    noParityClaimFromRuntimeSnapshots: true,
  },
  api: {
    blueprintTotal: apiRows.length,
    implementedRuntime: 178,
    planned: plannedApiRows.length,
    exactPlannedPaths: plannedApiRows.map((row) => `${row.method} ${row.path}`),
    matrixPath: `agent_pack/08_reality_sync/API_DATABASE_RUNTIME_GAP_MATRIX_${reportDate}.json`,
    allPlannedRoutesPendingG4Revalidation: true,
  },
  locale: {
    inventoryPath: `agent_pack/08_reality_sync/RETIRED_LOCALE_INVENTORY_${reportDate}.json`,
    activeLocales: approvedLocales,
    retiredLocales: excludedLocales,
    occurrenceCount: localeOccurrences.length,
    noDeletionOrMigration: true,
  },
  visualArtifacts: {
    inventoryPath: `agent_pack/08_reality_sync/DOCUMENTATION_IMAGE_ARTIFACT_INVENTORY_${reportDate}.json`,
    manifestPath: `agent_pack/08_reality_sync/VISUAL_EVIDENCE_MANIFEST_${reportDate}.json`,
    trackedImageCount: imageEntries.length,
    trackedImageBytes: imageEntries.reduce((sum, file) => sum + file.bytes, 0),
    bundleVersion,
    bundleSha256,
    externalPublicationStatus: 'NOT_PUBLISHED; owner approval/storage is required before untracking.',
    indexUntrackingPerformed: false,
    historyRewritePerformed: false,
  },
  livePreview: {
    handoffPath: `agent_pack/08_reality_sync/LIVE_PREVIEW_HANDOFF_${reportDate}.md`,
    nodeVersion: 'v24.19.0',
    npmVersion: '11.6.4',
    localCheck: { command: 'npm.cmd run local:check', exitCode: 0, status: 'LOCAL_DOCTOR_OK' },
    localStatus: { command: 'npm.cmd run local:status', exitCode: 1, status: 'LOCAL_STATUS stopped ready=false' },
    urls: ['http://localhost:8080', 'http://localhost:8025'],
    startSequencePublishedOnly: true,
    startedByCoordinator: false,
  },
  governance: {
    riskMatrixPath: `agent_pack/08_reality_sync/MASTER_RISK_APPROVAL_ROLLBACK_MATRIX_${reportDate}.json`,
    nextTaskGoalPath: `agent_pack/08_reality_sync/NEXT_TASK_LUNA_GOAL_BACKEND_150_${reportDate}.md`,
    atomicRunnerPath: `agent_pack/08_reality_sync/ACTIVE_ONE_TASK_LUNA_RUNNER_${reportDate}.md`,
    noNestedAgents: true,
    noCommitPushDeploy: true,
  },
};
writeJson(`agent_pack/08_reality_sync/MASTER_REALITY_RECONCILIATION_${reportDate}.json`, masterTruthReport);


const reconciliationCheckpoint = {
  ...checkpoint,
  masterRealityReconciliation: {
    reportPath: `agent_pack/08_reality_sync/MASTER_REALITY_RECONCILIATION_${reportDate}.json`,
    marker: 'MASTER_REALITY_RECONCILED_ACTIVE_PROGRAM_READY',
    generatedAt,
    noTaskStarted: true,
    nextDependencyReadyTask: stepInfo?.selectedTaskId || 'backend_150',
    screenMatrixPath: `agent_pack/08_reality_sync/MASTER_131_SCREEN_GAP_MATRIX_${reportDate}.json`,
    apiMatrixPath: `agent_pack/08_reality_sync/API_DATABASE_RUNTIME_GAP_MATRIX_${reportDate}.json`,
    localeInventoryPath: `agent_pack/08_reality_sync/RETIRED_LOCALE_INVENTORY_${reportDate}.json`,
    visualManifestPath: `agent_pack/08_reality_sync/VISUAL_EVIDENCE_MANIFEST_${reportDate}.json`,
    livePreviewHandoffPath: `agent_pack/08_reality_sync/LIVE_PREVIEW_HANDOFF_${reportDate}.md`,
  },
};
writeJson('agent_pack/03_execution/RUN_CHECKPOINT.json', reconciliationCheckpoint);

const reconciliationManifest = {
  ...manifest,
  currentRealityReconciliation: {
    reportPath: `08_reality_sync/MASTER_REALITY_RECONCILIATION_${reportDate}.json`,
    marker: 'MASTER_REALITY_RECONCILED_ACTIVE_PROGRAM_READY',
    activeProgramId,
    nextTaskId: stepInfo?.selectedTaskId || 'backend_150',
    noTaskStarted: true,
    screenMatrixPath: `08_reality_sync/MASTER_131_SCREEN_GAP_MATRIX_${reportDate}.json`,
    apiMatrixPath: `08_reality_sync/API_DATABASE_RUNTIME_GAP_MATRIX_${reportDate}.json`,
    localeInventoryPath: `08_reality_sync/RETIRED_LOCALE_INVENTORY_${reportDate}.json`,
    visualEvidenceManifestPath: `08_reality_sync/VISUAL_EVIDENCE_MANIFEST_${reportDate}.json`,
    livePreviewHandoffPath: `08_reality_sync/LIVE_PREVIEW_HANDOFF_${reportDate}.md`,
  },
};
writeJson('agent_pack/03_execution/MANIFEST.json', reconciliationManifest);

const completionRecord = {
  schemaVersion: 1,
  reportId: `MASTER_REALITY_RECONCILIATION_COMPLETION_${reportDate}`,
  generatedAt,
  marker: 'MASTER_REALITY_RECONCILED_ACTIVE_PROGRAM_READY',
  executionStatus: 'RECONCILIATION_COMPLETE_NO_TASK_STARTED',
  catalogTask: false,
  activeProgramId,
  selectedNextTask: stepInfo?.selectedTaskId || 'backend_150',
  noTaskStarted: true,
  selectedTaskStarted: false,
  deliverables: [
    `agent_pack/08_reality_sync/MASTER_REALITY_RECONCILIATION_${reportDate}.json`,
    `agent_pack/08_reality_sync/MASTER_131_SCREEN_GAP_MATRIX_${reportDate}.json`,
    `docs/quality/figma_parity/MASTER_131_SCREEN_GAP_REPORT_${reportDate}.md`,
    `agent_pack/08_reality_sync/API_DATABASE_RUNTIME_GAP_MATRIX_${reportDate}.json`,
    `agent_pack/08_reality_sync/RETIRED_LOCALE_INVENTORY_${reportDate}.json`,
    `agent_pack/08_reality_sync/DOCUMENTATION_IMAGE_ARTIFACT_INVENTORY_${reportDate}.json`,
    `agent_pack/08_reality_sync/VISUAL_EVIDENCE_MANIFEST_${reportDate}.json`,
    `agent_pack/08_reality_sync/MASTER_RISK_APPROVAL_ROLLBACK_MATRIX_${reportDate}.json`,
    `agent_pack/08_reality_sync/LIVE_PREVIEW_HANDOFF_${reportDate}.md`,
    `agent_pack/08_reality_sync/NEXT_TASK_LUNA_GOAL_BACKEND_150_${reportDate}.md`,
    `agent_pack/08_reality_sync/ACTIVE_ONE_TASK_LUNA_RUNNER_${reportDate}.md`,
  ],
  mutationStatement: 'No product, database, image, snapshot, locale, Git-index, commit, push, deploy, or history rewrite mutation was performed by this reconciliation.',
};
writeJson(`agent_pack/08_reality_sync/MASTER_REALITY_RECONCILIATION_COMPLETION_${reportDate}.json`, completionRecord);

console.log(JSON.stringify({
  marker: 'MASTER_REALITY_RECONCILED_ACTIVE_PROGRAM_READY',
  generatedAt,
  screens: screenGapRows.length,
  screenExceptions: externalExceptionIds.size,
  api: { total: apiRows.length, implemented: 178, planned: plannedApiRows.length },
  localeOccurrences: localeOccurrences.length,
  images: { count: imageEntries.length, bytes: imageEntries.reduce((sum, file) => sum + file.bytes, 0), bundleVersion, bundleSha256 },
  selectedNextTask: stepInfo?.selectedTaskId || 'backend_150',
  localPreview: { checkExitCode: 0, statusExitCode: 1, status: 'stopped' },
}, null, 2));
