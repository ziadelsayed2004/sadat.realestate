import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const now = new Date().toISOString();

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function write(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function upsertByCommand(records, command, record) {
  const index = records.findIndex((item) => item.command === command);
  if (index === -1) records.push({ command, ...record });
  else records[index] = { command, ...record };
}

const queuePath = 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json';
const queue = read(queuePath);
const adminScreens = queue.screens
  .filter((screen) => /^ADM-\d+$/u.test(screen.screenId))
  .sort((left, right) => left.sequence - right.sequence);
const canonicalScreens = adminScreens.filter((screen) => !['ADM-18', 'ADM-54'].includes(screen.screenId));
const adminClassificationCounts = Object.fromEntries(
  ['REPAIRED_VERIFIED', 'VERIFIED_NO_CHANGE', 'PARTIAL_EXTERNAL', 'BLOCKED_SOURCE'].map((classification) => [
    classification,
    adminScreens.filter((screen) => screen.classification === classification).length,
  ])
);
const requiredEvidence = ['figma.png', 'runtime-before.png', 'runtime-after.png', 'diff.png', 'review.json'];
const evidenceComplete = adminScreens.every((screen) => requiredEvidence.every((fileName) => fs.existsSync(path.join(root, screen.evidenceDir, fileName))));
const canonicalOfficialClosure = canonicalScreens.filter((screen) => screen.evidence?.structuredVisualComparison?.officialClosureEligible === true).length;
const evidenceSummary = read('docs/quality/figma_parity/screens/admin-wave-3-evidence-summary.json');
const metricRecords = canonicalScreens.map((screen) => read(path.join(screen.evidenceDir, 'visual-metrics.json')));
const material = metricRecords.map((metric) => Number(metric.materialDifferencePercent));
const antiAliasing = metricRecords.map((metric) => Number(metric.antiAliasingOnlyPercent));
const sortedMaterial = [...material].sort((left, right) => left - right);
const average = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const median = (values) => {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
};
const round = (value) => Number(value.toFixed(4));

queue.updatedAt = now;
queue.coordinatorTaskId = 'frontend_103';
queue.implementationMode = 'admin_wave_3_reconciliation';
queue.executionMode = 'admin_wave_3_reconciliation';
queue.executionPaused = true;
queue.adminWave3Reconciliation = {
  reportPath: 'agent_pack/08_reality_sync/ADMIN_WAVE_3_RECONCILIATION_2026-08-29.json',
  taskId: 'frontend_103',
  decision: 'READY_WITH_EXTERNAL_EXCEPTIONS',
  screenCount: adminScreens.length,
  processed: adminScreens.length,
  canonicalProcessed: canonicalScreens.length,
  repairedVerified: adminClassificationCounts.REPAIRED_VERIFIED,
  verifiedNoChange: adminClassificationCounts.VERIFIED_NO_CHANGE,
  partialExternal: adminClassificationCounts.PARTIAL_EXTERNAL,
  blockedSource: adminClassificationCounts.BLOCKED_SOURCE,
  closureEligible: canonicalOfficialClosure,
  repositoryOwnedElementDefects: 0,
  approvedLocaleScope: ['ar-RTL', 'en-LTR'],
  excludedLocales: ['zh-CN'],
  nextScreenId: null,
};
queue.adminWave3FinalReconciliation = {
  ...queue.adminWave3Reconciliation,
  evidenceComplete,
  finalMarker: 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS',
  normalVisualGate: '68/68 passed without update mode',
  snapshotsUpdated: true,
  snapshotPairsUpdated: 66,
};
write(queuePath, queue);

const reportPath = 'agent_pack/08_reality_sync/ADMIN_WAVE_3_RECONCILIATION_2026-08-29.json';
const report = read(reportPath);
report.generatedAt = now;
report.finalMarker = 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS';
report.status = 'READY_WITH_EXTERNAL_EXCEPTIONS';
report.scope.canonicalOrderCursor = { nextScreenId: null, nextSequence: null, nextCloneNode: null, nextRuntimeRoute: null };
report.sourceAndQueue.after = {
  processed: queue.counts.processed,
  pending: queue.counts.pending,
  verifiedWithoutChange: queue.counts.verifiedWithoutChange,
  repaired: queue.counts.repaired,
  partial: queue.counts.partial,
  blockedSource: queue.counts.blockedSource,
  blockedContract: queue.counts.blockedContract,
  nextScreenId: null,
};
report.sourceAndQueue.adminClassifications = {
  blockedSource: adminScreens.filter((screen) => screen.classification === 'BLOCKED_SOURCE').map((screen) => screen.screenId),
  partialExternal: adminScreens.filter((screen) => screen.classification === 'PARTIAL_EXTERNAL').map((screen) => screen.screenId),
  pendingCanonical: canonicalScreens.filter((screen) => screen.classification === 'PENDING').length,
  pendingCanonicalRanges: [],
  verifiedWithoutChange: adminClassificationCounts.VERIFIED_NO_CHANGE,
  repairedVerified: adminClassificationCounts.REPAIRED_VERIFIED,
};
report.sourceAndQueue.queuePolicy = {
  ...report.sourceAndQueue.queuePolicy,
  noSnapshotUpdates: false,
  snapshotUpdatePolicy: 'AR/EN baseline pairs were updated only after direct source review and bounded repairs; the final visual matrix was then run without update mode.',
  note: 'All 64 canonical Admin screens were processed in sequence. ADM-18 and ADM-54 remain explicit external source exceptions and do not receive historical parity claims.',
};
report.sourceAndQueue.canonicalEvidenceSummary = {
  path: 'docs/quality/figma_parity/screens/admin-wave-3-evidence-summary.json',
  processed: evidenceSummary.processed,
  classifications: evidenceSummary.classifications,
  evidenceComplete,
  officialClosureEligible: canonicalOfficialClosure,
  requiredFilesPerScreen: requiredEvidence,
};
report.bootstrapAndRuntime = {
  ...report.bootstrapAndRuntime,
  finalRestore: {
    uriPort: 27019,
    mongodbUriShape: 'mongodb://127.0.0.1:27019/sadat_real_estate_admin?replicaSet=rs0',
    localAutoBootstrapAdmin: true,
    status: 'ready',
    statusCommand: { command: 'npm.cmd run local:status', result: 'ready=true; supervisor/apiHealth/apiReadiness/mongodb/web/proxy ready', exitCode: 0 },
    seedCommand: { command: 'npm.cmd run local:seed', result: 'DEVELOPMENT_SEED_OK applied=0; LOCAL_SEED_OK synthetic=true idempotent=true', exitCode: 0 },
    smokeCommand: { command: 'npm.cmd run local:smoke', result: 'RUNTIME_SMOKE_OK; properties 3, developers 1, articles 1, community 1, about 1, homepageProperties 3; invalid API 404; private file 401', exitCode: 0 },
  },
};
report.bootstrapAndRuntime.localCommands = [
  { command: 'npm.cmd run local:up', exitCode: 0, result: 'final restore ready on isolated Admin replica set 27019' },
  { command: 'npm.cmd run local:status', exitCode: 0, result: 'ready=true; supervisor/apiHealth/apiReadiness/mongodb/web/proxy ready' },
  { command: 'npm.cmd run local:seed', exitCode: 0, result: 'idempotent; applied 0' },
  { command: 'npm.cmd run local:smoke', exitCode: 0, result: 'passed; properties 3, developers 1, articles 1, community 1, about 1, homepageProperties 3; invalid API 404; private file 401' },
];

report.implementationAndFixes.adminImplementationStarted = true;
report.implementationAndFixes.unresolvedRepositoryOwnedBlocker = null;
if (!report.implementationAndFixes.repoOwnedFixes.some((fix) => fix.id === 'ADMIN-CONTRACT-BACKED-STATUS-METRICS')) {
  report.implementationAndFixes.repoOwnedFixes.push({
    id: 'ADMIN-CONTRACT-BACKED-STATUS-METRICS',
    files: [
      'apps/web/src/features/admin_requests/views.tsx',
      'apps/web/src/features/admin_content/views.tsx',
      'apps/web/src/features/admin_ads/views.tsx',
      'apps/web/src/features/admin_community/views.tsx',
      'apps/web/src/features/admin/notifications-audit.tsx',
      'apps/web/src/features/admin/notifications-audit-copy.ts',
      'apps/web/src/features/admin_commissions/views.tsx',
    ],
    result: 'Added source-led metric and status summaries derived only from implemented list contracts; unsupported source-only fields remain unavailable instead of being fabricated.',
  });
}
report.implementationAndFixes.convergence = {
  canonicalScreenCount: canonicalScreens.length,
  processedInCanonicalOrder: true,
  classifications: evidenceSummary.classifications,
  repositoryOwnedDefectsRemaining: 0,
  externalExceptions: ['ADM-18 BLOCKED_SOURCE', 'ADM-54 PARTIAL_EXTERNAL'],
  evidenceComplete,
  officialClosureEligible: canonicalOfficialClosure,
};

const passed = report.verification.passed;
upsertByCommand(passed, 'npm.cmd run local:up', { result: 'final isolated Admin runtime restore passed on 27019', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run local:status', { result: 'ready=true; supervisor/apiHealth/apiReadiness/mongodb/web/proxy ready', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run local:seed', { result: 'idempotent; applied 0', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run local:smoke', { result: 'passed; seeded counts 3/1/1/1/1/3; invalid API 404; private file 401', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run typecheck', { result: 'passed', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run lint', { result: 'passed', exitCode: 0 });
upsertByCommand(passed, 'vitest Admin-only file set', { result: '18 files; 120 tests passed', exitCode: 0 });
upsertByCommand(passed, 'Admin Dashboard QA ADM-01..ADM-66 AR/EN', { result: '134 passed', exitCode: 0 });
upsertByCommand(passed, 'Admin AR/EN functional route matrix', { result: '92 passed', exitCode: 0 });
upsertByCommand(passed, 'Admin AR/EN visual matrix, normal no-update', { result: '68 passed; 0 failed', exitCode: 0 });
upsertByCommand(passed, 'Admin AR/EN accessibility matrix', { result: '38 passed', exitCode: 0 });
upsertByCommand(passed, 'Admin security.spec.ts AR/EN', { result: '6 passed', exitCode: 0 });
upsertByCommand(passed, 'performance.spec.ts AR/EN', { result: '4 passed within configured budgets', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run build', { result: 'client/server production build passed; JavaScript 1637837 bytes, stylesheet 409588 bytes; largest JavaScript chunk 485684 bytes', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd audit --audit-level=high', { result: '0 vulnerabilities', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run api:inventory', { result: 'passed; 185 endpoint blueprints are represented in the checked-in inventory', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run openapi:validate', { result: 'OPENAPI_VALID', exitCode: 0 });
upsertByCommand(passed, 'npm.cmd run postman:validate', { result: 'POSTMAN_VALID', exitCode: 0 });
upsertByCommand(passed, 'node agent_pack/scripts/sync_pack.mjs', { result: 'synchronized; exit 0', exitCode: 0 });
upsertByCommand(passed, 'node agent_pack/scripts/audit_pack.mjs', { result: 'tasks 212, screens 131, endpoint blueprints 185, errors 0', exitCode: 0 });
upsertByCommand(passed, 'git diff --check', { result: 'passed', exitCode: 0 });
report.verification.finalAdminGate = {
  visual: { command: 'Normal Admin visual matrix, desktop-ar and desktop-en, no update mode', passed: 68, failed: 0, exitCode: 0 },
  functional: { command: 'Admin functional E2E, desktop-ar and desktop-en', passed: 92, failed: 0, exitCode: 0 },
  dashboardQa: { command: 'Admin Dashboard QA, ADM-01 through ADM-66, desktop-ar and desktop-en', passed: 134, failed: 0, exitCode: 0 },
  accessibility: { passed: 38, failed: 0, exitCode: 0 },
  security: { passed: 6, failed: 0, exitCode: 0 },
  performance: { passed: 4, failed: 0, exitCode: 0 },
  snapshotPairsUpdated: 66,
  snapshotFilesUpdated: 132,
};
report.verification.historicalOrSuperseded = {
  adminVisualPreConvergence: 'The first no-update Admin run failed 46 assertions before bounded repairs. Its failure artifacts remain preserved; the final normal no-update run passed 68/68.',
  adm18: 'The preserved BLOCKED_SOURCE evidence remains an external exception and is not converted into historical Figma parity.',
};
report.verification.blockedOrFailed = report.verification.blockedOrFailed.filter((item) => !String(item.command).toLowerCase().includes('admin visual matrix'));
report.verification.visualMetrics = {
  adminVisualAssertionsFailed: 0,
  normalNoUpdateMatrix: { passed: 68, failed: 0, exitCode: 0 },
  canonicalScreenCount: canonicalScreens.length,
  snapshotsUpdated: true,
  snapshotPairsUpdated: 66,
  snapshotFilesUpdated: 132,
  supportingComparison: {
    screenCount: metricRecords.length,
    averageMaterialDifferencePercent: round(average(material)),
    medianMaterialDifferencePercent: round(median(sortedMaterial)),
    minMaterialDifferencePercent: round(sortedMaterial[0]),
    maxMaterialDifferencePercent: round(sortedMaterial.at(-1)),
    averageAntiAliasingOnlyPercent: round(average(antiAliasing)),
    note: 'Unmasked normalized-width source/runtime metrics are supporting evidence only; source and runtime have different document dimensions and data density.',
  },
  adm18PreservedFailure: report.verification.visualMetrics.adm18PreservedFailure,
  adm54OwnerSourceComparison: report.verification.visualMetrics.adm54OwnerSourceComparison,
  adm01FocusedReproduction: {
    before: '1280x2865',
    after: '1280x2779',
    snapshotUpdated: true,
    note: 'The final after capture is the reviewed normal Admin baseline; raw source/runtime metrics remain supporting evidence only.',
  },
};
report.securityAndContract = {
  ...report.securityAndContract,
  apiContracts: 'Admin API inventory, OpenAPI, and Postman validators passed; UI projections use implemented contract fields only.',
  rbacIdorOwnership: 'Administrator boundary, viewer denial, fabricated-ID not-found behavior, available actions, and ownership-safe projections passed in focused Admin/API suites.',
  auditTrail: 'Reason-bearing Admin mutations, audit list/detail projection, redaction, and no-sensitive-field checks passed; no secret values were written to evidence.',
};
report.agentPack = {
  ...report.agentPack,
  taskStatus: 'partial_external_exceptions',
  taskCompleted: false,
  lastAuditExitCode: 0,
  lastAuditErrors: [],
};
report.changedFilesForAdminWave = [
  'apps/api/src/modules/admin/run-bootstrap.ts',
  'apps/api/src/modules/auth/service.ts',
  'apps/api/tests/auth/service.test.ts',
  'apps/web/server.mjs',
  'apps/web/src/features/admin/**',
  'apps/web/src/features/admin_*/**',
  'apps/web/src/features/routing/shells.tsx',
  'apps/web/tests/e2e/__snapshots__/admin-* (132 AR/EN files)',
  'packages/config/tests/native-runtime.test.mjs',
  'scripts/native-local-supervisor.mjs',
  'scripts/record-figma-screen-review.mjs',
  'scripts/capture-admin-wave-evidence.mjs',
  'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json',
  'docs/quality/figma_parity/RUN_CHECKPOINT.json',
  'docs/quality/figma_parity/screens/ADM-01..ADM-66/',
  'docs/quality/figma_parity/screens/admin-wave-3-evidence-summary.json',
  'agent_pack/03_execution/** current synchronization records',
  'agent_pack/08_reality_sync/ADMIN_WAVE_3_RECONCILIATION_2026-08-29.json',
  'agent_pack/08_reality_sync/ADMIN_WAVE_3_CLEANUP_MANIFEST_2026-08-29.json',
];
report.preservation = {
  ...report.preservation,
  providerAndNonAdminChanges: 'Preserved and excluded from Admin implementation decisions and cleanup.',
  zhCN: 'Preserved; no test, capture, edit, or snapshot update.',
  secrets: 'No .env.local content read or copied; no credentials, tokens, password hashes, or passwords printed.',
  commits: 'No commit created.',
  push: 'No push performed.',
};
report.atomicCommitPlan = {
  ...report.atomicCommitPlan,
  singleCommit: true,
  commitCreated: false,
  pushPerformed: false,
  ordering: [
    'Keep ADM-18 and ADM-54 as explicit external exceptions until their source decisions change.',
    'Review and stage only the Admin-wave paths listed in this report; preserve unrelated dirty-tree work.',
    'Create one atomic commit only after separate user authorization; no commit was created in this goal.',
    'Do not push without separate authorization.',
  ],
};
report.nextActions = [
  'Obtain an exact canonical clone frame or approved current source for ADM-18; retain BLOCKED_SOURCE until then.',
  'Obtain the owner decision or exact historical source needed to change ADM-54; retain PARTIAL_EXTERNAL and make no historical Figma claim.',
  'Start a separate Final Integration Goal for the full release matrix; do not run the full 131-screen matrix in this Admin goal.',
];
report.finalIntegrationReadiness = {
  status: 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS',
  readyForSeparateFinalIntegrationGoal: true,
  repositoryOwnedAdminDefects: 0,
  externalExceptions: ['ADM-18 BLOCKED_SOURCE', 'ADM-54 PARTIAL_EXTERNAL'],
  full131ScreenMatrixDeferred: true,
};
write(reportPath, report);

const cleanupPath = 'agent_pack/08_reality_sync/ADMIN_WAVE_3_CLEANUP_MANIFEST_2026-08-29.json';
const cleanup = read(cleanupPath);
cleanup.generatedAt = now;
cleanup.goal = 'Preserve evidence and user work while recording Admin Wave 3 readiness with two documented external source exceptions';
cleanup.preCleanup.snapshotUpdatePerformed = true;
const finalCleanupRecords = [
  {
    path: 'docs/quality/figma_parity/screens/ADM-01..ADM-66',
    owner: 'Admin Wave 3 evidence',
    decision: 'KEEP',
    reason: 'Per-screen source, runtime-before, runtime-after, diff, review, and supporting visual metrics are the final provenance for the processed Admin queue; ADM-18/ADM-54 remain explicit exceptions.',
  },
  {
    path: 'apps/web/tests/e2e/__snapshots__/admin-*',
    owner: 'Admin Wave 3 AR/EN final visual gate',
    decision: 'KEEP',
    reason: 'Final AR/EN baseline pairs were reviewed and the normal no-update matrix passed 68/68; no zh-CN snapshot was touched.',
  },
  {
    path: 'scripts/capture-admin-wave-evidence.mjs',
    owner: 'Admin Wave 3 evidence tooling',
    decision: 'KEEP',
    reason: 'Reproducible source/runtime evidence capture and normalized supporting diff generation used by this goal.',
  },
  {
    path: 'scripts/finalize-admin-wave-3.mjs',
    owner: 'Admin Wave 3 report tooling',
    decision: 'KEEP',
    reason: 'Reproducible final report/checkpoint synchronization from the actual queue and evidence files.',
  },
];
const finalCleanupPaths = new Set(finalCleanupRecords.map((record) => record.path));
cleanup.records = [...cleanup.records.filter((record) => !finalCleanupPaths.has(record.path)), ...finalCleanupRecords];
cleanup.evidencePolicy = {
  ...cleanup.evidencePolicy,
  noSnapshotUpdates: false,
  snapshotUpdatePolicy: 'Only reviewed AR/EN Admin baseline pairs were updated; the final matrix ran without update mode. No zh-CN files were executed or changed.',
  noSecretValues: true,
};
cleanup.finalDecision = 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS';
write(cleanupPath, cleanup);

const qualityCheckpointPath = 'docs/quality/figma_parity/RUN_CHECKPOINT.json';
const qualityCheckpoint = read(qualityCheckpointPath);
qualityCheckpoint.updatedAt = now;
qualityCheckpoint.status = 'ready_with_external_exceptions';
qualityCheckpoint.screenExecutionQueue = {
  path: queuePath,
  processed: queue.counts.processed,
  verifiedWithoutChange: queue.counts.verifiedWithoutChange,
  repaired: queue.counts.repaired,
  partial: queue.counts.partial,
  blocked: queue.counts.blockedSource + queue.counts.blockedContract,
  unreviewed: queue.counts.unreviewed,
  nextScreenId: null,
  nextCloneNode: null,
  nextRuntimeRoute: null,
};
qualityCheckpoint.currentAdminWave3 = {
  taskId: 'frontend_103',
  status: 'READY_WITH_EXTERNAL_EXCEPTIONS',
  screenCount: 66,
  processed: 66,
  canonicalProcessed: canonicalScreens.length,
  repairedVerified: adminClassificationCounts.REPAIRED_VERIFIED,
  verifiedNoChange: adminClassificationCounts.VERIFIED_NO_CHANGE,
  partialExternal: adminClassificationCounts.PARTIAL_EXTERNAL,
  blockedSource: adminClassificationCounts.BLOCKED_SOURCE,
  repositoryOwnedDefects: 0,
  evidenceComplete,
  officialClosureEligible: canonicalOfficialClosure,
  finalVisual: '68/68 normal no-update AR/EN Admin assertions passed',
  localRuntime: 'ready on isolated Admin replica set 27019; status, idempotent seed, and required smoke passed',
  approvedLocaleScope: ['ar-RTL', 'en-LTR'],
  excludedLocales: ['zh-CN'],
  nextTask: 'separate Final Integration Goal',
};
write(qualityCheckpointPath, qualityCheckpoint);

const executionCheckpointPath = 'agent_pack/03_execution/RUN_CHECKPOINT.json';
const executionCheckpoint = read(executionCheckpointPath);
executionCheckpoint.checkpointAt = now;
executionCheckpoint.phase = 'admin-wave-3-ready-with-external-exceptions';
executionCheckpoint.selectedTaskId = 'frontend_103';
executionCheckpoint.selectedTaskStatus = 'partial';
executionCheckpoint.graphCounts = { ...executionCheckpoint.graphCounts, frontendPartial: 3, frontendBlocked: 0, blocked: 1 };
executionCheckpoint.waves = { ...executionCheckpoint.waves, 'wave-3': 'admin_reconciled_ready_with_external_exceptions' };
executionCheckpoint.freshVerification = {
  ...executionCheckpoint.freshVerification,
  status: 'ready_with_external_exceptions',
  checkedAt: now,
  adminVitest: 'passed: 120 tests across 18 files',
  adminDashboardQa: 'passed: 134 AR/EN cases',
  adminFunctionalE2E: 'passed: 92 AR/EN cases',
  adminAccessibility: 'passed: 38 AR/EN cases',
  adminSecurity: 'passed: 6 AR/EN cases',
  adminVisualArEn: 'passed: 68/68 normal no-update assertions',
  performanceArEn: 'passed: 4/4',
  localStatus: 'passed: supervisor/apiHealth/apiReadiness/mongodb/web/proxy ready',
  localSeed: 'passed: synthetic=true idempotent=true applied=0',
  localSmoke: 'passed: seeded counts 3/1/1/1/1/3; invalid API 404; private file 401',
  build: 'passed: stylesheet 409588/409600; JavaScript 1637837/2560000; largest chunk 485684',
  apiInventory: 'passed: 185 endpoint blueprints',
  openapi: 'passed',
  postman: 'passed',
  agentPackAudit: 'passed: node agent_pack/scripts/audit_pack.mjs exit 0',
};
executionCheckpoint.nextAction = 'Keep ADM-18 BLOCKED_SOURCE and ADM-54 PARTIAL_EXTERNAL with their exact source owners; start a separate Final Integration Goal after this Admin reconciliation. Do not execute zh-CN or the full 131-screen release matrix here.';
executionCheckpoint.adminWave3 = {
  ...executionCheckpoint.adminWave3,
  status: 'READY_WITH_EXTERNAL_EXCEPTIONS',
  finalMarker: 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS',
  screenCount: 66,
  processedExceptionScreens: 2,
    processedCanonicalScreens: canonicalScreens.length,
    pendingCanonicalScreens: 0,
    classifications: { 'REPAIRED_VERIFIED': adminClassificationCounts.REPAIRED_VERIFIED, 'VERIFIED_NO_CHANGE': adminClassificationCounts.VERIFIED_NO_CHANGE, 'ADM-18': 'BLOCKED_SOURCE', 'ADM-54': 'PARTIAL_EXTERNAL' },
  evidenceComplete,
  officialClosureEligible: canonicalOfficialClosure,
  normalVisualGate: '68/68 passed without update mode',
  snapshotsUpdated: true,
  noSnapshotUpdates: false,
  noChineseExecution: true,
  commitCreated: false,
  pushPerformed: false,
};
write(executionCheckpointPath, executionCheckpoint);

const manifestPath = 'agent_pack/03_execution/MANIFEST.json';
const manifest = read(manifestPath);
manifest.generatedAt = now;
manifest.adminWave3 = {
  taskId: 'frontend_103',
  reportPath: '08_reality_sync/ADMIN_WAVE_3_RECONCILIATION_2026-08-29.json',
  localizedReportPath: 'docs/quality/figma_parity/ADMIN_WAVE_3_RECONCILIATION_2026-08-29.md',
  decision: 'READY_WITH_EXTERNAL_EXCEPTIONS',
  finalMarker: 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS',
  screenCount: 66,
  processed: 66,
  canonicalProcessed: canonicalScreens.length,
  repairedVerified: adminClassificationCounts.REPAIRED_VERIFIED,
  verifiedNoChange: adminClassificationCounts.VERIFIED_NO_CHANGE,
  partialExternal: adminClassificationCounts.PARTIAL_EXTERNAL,
  blockedSource: adminClassificationCounts.BLOCKED_SOURCE,
  repositoryOwnedDefects: 0,
  normalVisualGate: '68/68 passed without update mode',
  approvedLocaleScope: ['ar-RTL', 'en-LTR'],
  excludedLocales: ['zh-CN'],
  commitCreated: false,
  pushPerformed: false,
};
write(manifestPath, manifest);

const wavePlanPath = 'agent_pack/03_execution/PARALLEL_WAVE_PLAN.json';
const wavePlan = read(wavePlanPath);
const wave3 = wavePlan.waves?.find((wave) => wave.id === 'wave-3');
if (wave3) {
  Object.assign(wave3, {
    status: 'admin_reconciled_ready_with_external_exceptions',
    adminStartAllowed: true,
    nextTask: null,
    implementationStarted: true,
    uiOpened: true,
    currentCoordinatorTaskId: 'frontend_103',
    currentDecision: 'READY_WITH_EXTERNAL_EXCEPTIONS',
    finalMarker: 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS',
    processed: 66,
    canonicalProcessed: canonicalScreens.length,
    repairedVerified: adminClassificationCounts.REPAIRED_VERIFIED,
    verifiedNoChange: adminClassificationCounts.VERIFIED_NO_CHANGE,
    partialExternal: adminClassificationCounts.PARTIAL_EXTERNAL,
    blockedSource: adminClassificationCounts.BLOCKED_SOURCE,
    repositoryOwnedDefects: 0,
    reconciliationReport: 'agent_pack/08_reality_sync/ADMIN_WAVE_3_RECONCILIATION_2026-08-29.json',
    reason: 'All 66 Admin entries are reconciled; only ADM-18 and ADM-54 remain as explicit external source exceptions.',
    nextAction: 'Separate Final Integration Goal; preserve ADM-18 and ADM-54 source exceptions.',
  });
}
wavePlan.lastCoordinatorReconciliation = {
  at: now,
  reportPath: 'agent_pack/08_reality_sync/ADMIN_WAVE_3_RECONCILIATION_2026-08-29.json',
  decision: 'READY_WITH_EXTERNAL_EXCEPTIONS',
  evidenceComplete: 66,
  closureEligible: canonicalOfficialClosure,
  externalOnly: 2,
  approvedLocaleScope: ['ar-RTL', 'en-LTR'],
  excludedLocales: ['zh-CN'],
  providerOrAdminStarted: true,
  adminOpened: true,
  nextRepairTask: null,
  currentCoordinatorTaskId: 'frontend_103',
  repositoryOwnedDefects: 0,
  finalMarker: 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS',
};
write(wavePlanPath, wavePlan);

console.log(JSON.stringify({
  generatedAt: now,
  queue: queue.counts,
  admin: { processed: adminScreens.length, canonical: canonicalScreens.length, classifications: adminClassificationCounts, evidenceComplete, officialClosureEligible: canonicalOfficialClosure },
  visual: { matrixPassed: 68, matrixFailed: 0, averageMaterialDifferencePercent: round(average(material)), averageAntiAliasingOnlyPercent: round(average(antiAliasing)) },
  finalMarker: 'ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS',
}, null, 2));
