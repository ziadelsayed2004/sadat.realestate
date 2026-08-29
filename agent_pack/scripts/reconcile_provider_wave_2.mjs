import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANONICAL_KEY = 'Odl1Epn2u6lIEuIMmABT7o';
const FORBIDDEN_KEY = '0HBdTNGROmmpC6S7OYa3iJ';
const REPORT_PATH = 'agent_pack/08_reality_sync/PROVIDER_WAVE_2_FINAL_RECONCILIATION_2026-08-29.json';
const QUEUE_PATH = 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json';
const PARITY_PATH = 'docs/quality/figma_parity/FIGMA_PARITY_LEDGER.json';
const CHECKPOINT_PATH = 'docs/quality/figma_parity/RUN_CHECKPOINT.json';
const LANE_PATH = 'agent_pack/08_reality_sync/PROVIDER_WAVE_2_LANE_LEDGER.json';
const EVIDENCE_ROOT = 'docs/quality/figma_parity/screens';
const NOW = new Date().toISOString();

const SCREEN_IDS = [
  'PRV-01', 'PRV-02', 'PRV-03', 'PRV-04', 'PRV-05', 'PRV-06', 'PRV-07',
  'PRV-08', 'PRV-09', 'PRV-10', 'PRV-11', 'PRV-12', 'PRV-13', 'PRV-14',
  'PRV-15', 'PRV-16', 'PRV-17', 'PRV-18', 'PRV-19', 'PRV-20', 'PRV-21',
  'PRV-22-1', 'PRV-22-2', 'PRV-22-3'
];

const ACTUAL_FILENAMES = Object.freeze({
  'PRV-01': { ar: 'provider-overview-ar-actual.png', en: 'provider-overview-en-actual.png' },
  'PRV-02': { ar: 'provider-properties-ar-actual.png', en: 'provider-properties-en-actual.png' },
  'PRV-03': { ar: 'provider-property-basic-ar-actual.png', en: 'provider-property-basic-en-actual.png' },
  'PRV-04': { ar: 'provider-property-location-ar-actual.png', en: 'provider-property-location-en-actual.png' },
  'PRV-05': { ar: 'provider-property-details-ar-actual.png', en: 'provider-property-details-en-actual.png' },
  'PRV-06': { ar: 'provider-property-price-ar-actual.png', en: 'provider-property-price-en-actual.png' },
  'PRV-07': { ar: 'provider-property-features-ar-actual.png', en: 'provider-property-features-en-actual.png' },
  'PRV-08': { ar: 'provider-property-media-ar-actual.png', en: 'provider-property-media-en-actual.png' },
  'PRV-09': { ar: 'provider-property-contact-ar-actual.png', en: 'provider-property-contact-en-actual.png' },
  'PRV-10': { ar: 'provider-property-review-ar-actual.png', en: 'provider-property-review-en-actual.png' },
  'PRV-11': { ar: 'provider-property-validation-ar-actual.png', en: 'provider-property-validation-en-actual.png' },
  'PRV-12': { ar: 'provider-property-submitted-ar-actual.png', en: 'provider-property-submitted-en-actual.png' },
  'PRV-13': { ar: 'provider-property-rejected-ar-actual.png', en: 'provider-property-rejected-en-actual.png' },
  'PRV-14': { ar: 'provider-property-published-ar-actual.png', en: 'provider-property-published-en-actual.png' },
  'PRV-15': { ar: 'provider-projects-ar-actual.png', en: 'provider-projects-en-actual.png' },
  'PRV-16': { ar: 'provider-customer-requests-ar-actual.png', en: 'provider-customer-requests-en-actual.png' },
  'PRV-17': { ar: 'provider-customer-request-modal-ar-actual.png', en: 'provider-customer-request-modal-en-actual.png' },
  'PRV-18': { ar: 'provider-viewings-ar-actual.png', en: 'provider-viewings-en-actual.png' },
  'PRV-19': { ar: 'provider-advertising-ar-actual.png', en: 'provider-advertising-en-actual.png' },
  'PRV-20': { ar: 'provider-commission-ar-actual.png', en: 'provider-commission-en-actual.png' },
  'PRV-21': { ar: 'provider-notifications-ar-actual.png', en: 'provider-notifications-en-actual.png' },
  'PRV-22-1': { ar: 'provider-settings-account-ar-actual.png', en: 'provider-settings-account-en-actual.png' }
});

const EXTERNAL_BLOCKERS = Object.freeze({
  'PRV-01': ['The safe Provider contract exposes property totals but not the canonical customer-request, views, booked, history, or chart series values; the runtime keeps these values explicitly unavailable.'],
  'PRV-02': [],
  'PRV-03': ['The current provider property create contract does not expose every canonical basic-form field; no fields were fabricated.'],
  'PRV-04': ['The current provider location contract does not expose every canonical address field; locationId and coordinates remain preserved and no geocoding/fetch was added.'],
  'PRV-05': ['The current provider catalog/detail contract does not expose every canonical extended property field; no unsupported taxonomy or metadata was invented.'],
  'PRV-06': ['The current provider price/payment contract does not expose every canonical commission/payment field; currency consistency and server-owned values remain enforced.'],
  'PRV-07': ['The canonical taxonomy/catalog content is not available from the provider contract; the browser route alias is repaired while unsupported catalog values remain unavailable.'],
  'PRV-08': ['The current provider media contract does not expose the canonical cover/minimum-media content; upload authorization and private storage boundaries remain enforced.'],
  'PRV-09': ['The current provider contact contract does not expose the canonical phone/contact grouping or internal notes; no phone identity field was introduced.'],
  'PRV-10': ['The current provider review contract does not expose every canonical summary field; the review remains limited to safe server projections and confirmations.'],
  'PRV-11': [],
  'PRV-12': [],
  'PRV-13': [],
  'PRV-14': [],
  'PRV-15': ['The current safe ProjectData projection lacks canonical image, unit, availability, and area metrics; no fields were invented.'],
  'PRV-16': ['The current provider request projection is intentionally redacted and does not expose all canonical CRM presentation fields.'],
  'PRV-17': ['The current provider request contract is intentionally limited to approved customer fields and server actions; no unsupported details were added.'],
  'PRV-18': ['The current provider viewing projection does not expose every canonical appointment presentation field; only contract-defined data is rendered.'],
  'PRV-19': ['The current advertising projection does not expose every canonical ad/content metric; private upload and quote boundaries remain server-owned.'],
  'PRV-20': ['The current commission projection is read-only and omits resolver/administrative fields required by the canonical export.'],
  'PRV-21': [],
  'PRV-22-1': [],
  'PRV-22-2': ['The current settings contact projection supports WhatsApp, office address, and website but not the canonical separate phone contact field.'],
  'PRV-22-3': ['The current settings contract does not support password-change or account-deletion actions; unsupported actions remain disabled and fail closed.']
});

const REPAIRED_FILES = Object.freeze({
  'PRV-01': ['apps/web/src/features/provider/overview.tsx', 'apps/web/src/features/provider/copy.ts', 'apps/web/src/features/provider/styles.css'],
  'PRV-02': ['apps/web/src/features/provider/properties.tsx', 'apps/web/src/features/provider/styles.css'],
  'PRV-03': ['apps/web/src/features/provider_property/wizard.tsx', 'apps/web/src/features/provider_property/data.ts'],
  'PRV-04': ['apps/web/src/features/provider_property/wizard.tsx', 'apps/web/src/features/provider_property/data.ts'],
  'PRV-05': ['apps/web/src/features/provider_property/advanced.tsx'],
  'PRV-06': ['apps/web/src/features/provider_property/advanced.tsx'],
  'PRV-07': ['apps/web/src/features/frontend_foundation/app.tsx', 'apps/web/src/features/provider_property/advanced.tsx', 'apps/web/src/features/provider_property/completion.tsx'],
  'PRV-08': ['apps/web/src/features/provider_property/completion.tsx', 'apps/web/src/features/provider_property/data.ts'],
  'PRV-09': ['apps/web/src/features/provider_property/completion.tsx'],
  'PRV-10': ['apps/web/src/features/provider_property/completion.tsx'],
  'PRV-11': ['apps/web/src/features/provider_property/state.tsx'],
  'PRV-12': ['apps/web/src/features/provider_property/state.tsx'],
  'PRV-13': ['apps/web/src/features/provider_property/state.tsx'],
  'PRV-14': ['apps/web/src/features/provider_property/state.tsx'],
  'PRV-15': ['apps/web/src/features/provider/projects.tsx', 'apps/web/src/features/provider/projects-data.ts'],
  'PRV-16': ['apps/web/src/features/provider/customer-requests.tsx', 'apps/web/src/features/provider/customer-requests-data.ts'],
  'PRV-17': ['apps/web/src/features/provider/customer-requests.tsx', 'apps/web/src/features/provider/customer-requests-data.ts'],
  'PRV-18': ['apps/web/src/features/provider/viewings.tsx'],
  'PRV-19': ['apps/web/src/features/provider/advertising.tsx', 'apps/web/src/features/provider/advertising-data.ts'],
  'PRV-20': ['apps/web/src/features/provider/advertising.tsx', 'apps/web/src/features/provider/advertising-data.ts'],
  'PRV-21': ['apps/web/src/features/provider/notifications.tsx'],
  'PRV-22-1': ['apps/web/src/features/provider/settings.tsx'],
  'PRV-22-2': ['apps/web/src/features/provider/settings.tsx', 'apps/web/src/features/provider/settings.css'],
  'PRV-22-3': ['apps/web/src/features/provider/settings.tsx', 'apps/web/src/features/provider/settings.css']
});

const FOCUSED_TESTS = Object.freeze({
  'PRV-01': ['apps/web/tests/provider-overview.vitest.test.tsx', 'apps/web/tests/e2e/provider-overview.spec.ts'],
  'PRV-02': ['apps/web/tests/provider-properties.vitest.test.tsx', 'apps/web/tests/e2e/provider-properties.spec.ts'],
  'PRV-03': ['apps/web/tests/provider-property-wizard.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-wizard.spec.ts'],
  'PRV-04': ['apps/web/tests/provider-property-wizard.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-wizard.spec.ts'],
  'PRV-05': ['apps/web/tests/provider-property-advanced.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-advanced.spec.ts'],
  'PRV-06': ['apps/web/tests/provider-property-advanced.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-advanced.spec.ts'],
  'PRV-07': ['apps/web/tests/provider-property-advanced.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-advanced.spec.ts'],
  'PRV-08': ['apps/web/tests/provider-property-completion.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-completion.spec.ts'],
  'PRV-09': ['apps/web/tests/provider-property-completion.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-completion.spec.ts'],
  'PRV-10': ['apps/web/tests/provider-property-completion.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-completion.spec.ts'],
  'PRV-11': ['apps/web/tests/provider-property-state.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-state.spec.ts'],
  'PRV-12': ['apps/web/tests/provider-property-state.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-state.spec.ts'],
  'PRV-13': ['apps/web/tests/provider-property-state.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-state.spec.ts'],
  'PRV-14': ['apps/web/tests/provider-property-state.vitest.test.tsx', 'apps/web/tests/e2e/provider-property-state.spec.ts'],
  'PRV-15': ['apps/web/tests/provider-projects.vitest.test.tsx', 'apps/web/tests/e2e/provider-projects.spec.ts'],
  'PRV-16': ['apps/web/tests/provider-customer-requests.vitest.test.tsx', 'apps/web/tests/e2e/provider-customer-requests.spec.ts'],
  'PRV-17': ['apps/web/tests/provider-customer-requests.vitest.test.tsx', 'apps/web/tests/e2e/provider-customer-requests.spec.ts'],
  'PRV-18': ['apps/web/tests/provider-viewings.vitest.test.tsx', 'apps/web/tests/e2e/provider-viewings.spec.ts'],
  'PRV-19': ['apps/web/tests/provider-advertising.vitest.test.tsx', 'apps/web/tests/e2e/provider-advertising.spec.ts'],
  'PRV-20': ['apps/web/tests/provider-advertising.vitest.test.tsx', 'apps/web/tests/e2e/provider-advertising.spec.ts'],
  'PRV-21': ['apps/web/tests/provider-notifications-settings.vitest.test.tsx', 'apps/web/tests/e2e/provider-notifications-settings.spec.ts'],
  'PRV-22-1': ['apps/web/tests/provider-notifications-settings.vitest.test.tsx', 'apps/web/tests/e2e/provider-notifications-settings.spec.ts'],
  'PRV-22-2': ['apps/web/tests/provider-notifications-settings.vitest.test.tsx', 'apps/web/tests/e2e/provider-notifications-settings.spec.ts'],
  'PRV-22-3': ['apps/web/tests/provider-notifications-settings.vitest.test.tsx', 'apps/web/tests/e2e/provider-notifications-settings.spec.ts']
});

function absolute(relativePath) { return path.join(ROOT, relativePath); }
function readJson(relativePath) { return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8')); }
function writeJson(relativePath, value) { fs.writeFileSync(absolute(relativePath), JSON.stringify(value, null, 2) + '\n'); }
function relativePath(filePath) { return path.relative(ROOT, filePath).replaceAll(path.sep, '/'); }
function fileSha(relativePath) { return crypto.createHash('sha256').update(fs.readFileSync(absolute(relativePath))).digest('hex'); }
function pngDimensions(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}

function findByName(fileName) {
  const found = walk(absolute('apps/web/test-results')).filter(filePath => path.basename(filePath) === fileName);
  if (found.length !== 1) throw new Error(`Expected exactly one current E2E artifact for ${fileName}; found ${found.length}`);
  return relativePath(found[0]);
}

function visualMetrics(actualRelativePath) {
  const contextPath = path.join(ROOT, path.dirname(actualRelativePath), 'error-context.md');
  if (!fs.existsSync(contextPath)) return null;
  const context = fs.readFileSync(contextPath, 'utf8');
  const match = context.match(/Expected an image (\d+)px by (\d+)px, received (\d+)px by (\d+)px\. ([\d,]+) pixels \(ratio ([0-9.]+) of all image pixels\)/u);
  if (!match) return null;
  return {
    expected: { width: Number(match[1]), height: Number(match[2]) },
    actual: { width: Number(match[3]), height: Number(match[4]) },
    differentPixels: Number(match[5].replaceAll(',', '')),
    ratio: Number(match[6]),
    errorContext: relativePath(contextPath)
  };
}

function runtimeCapture(screenId, locale, sourceRelativePath, captureMode) {
  const evidenceRelativePath = captureMode === 'direct-2026-08-29'
    ? `${EVIDENCE_ROOT}/${screenId}/runtime-after-${locale}.png`
    : `${EVIDENCE_ROOT}/${screenId}/runtime-after-${captureMode}-${locale}.png`;
  if (!fs.existsSync(absolute(evidenceRelativePath))) throw new Error(`Missing Provider evidence capture: ${evidenceRelativePath}`);
  return {
    locale,
    direction: locale === 'ar' ? 'rtl' : 'ltr',
    runtimePath: evidenceRelativePath,
    sourceArtifact: sourceRelativePath,
    captureMode,
    sha256: fileSha(evidenceRelativePath),
    ...pngDimensions(evidenceRelativePath),
    visual: captureMode === 'e2e-2026-08-29' ? visualMetrics(sourceRelativePath) : null
  };
}

function screenDefects(screenId) {
  const defects = [
    {
      id: 'PROVIDER-SHARED-NAV-ICON-GLYPHS',
      element: 'ProviderNavigation icons',
      owner: 'Coordinator',
      targetFile: 'apps/web/src/features/provider/overview.tsx',
      description: 'The shared Provider rail still renders text glyphs where the approved local Provider export uses outlined navigation icons; no approved Provider icon asset was found during the local source review.',
      requiredRepair: 'Replace the text glyph map with the approved icon implementation/assets while preserving the existing provider-only routes, locale query, active treatment, and direction behavior.'
    }
  ];
  if (screenId === 'PRV-01') defects.push({
    id: 'PRV-01-SAFE-DATA-BOUNDARY',
    element: 'Dashboard metric/chart data',
    owner: 'External contract/API boundary',
    targetFile: 'apps/web/src/features/provider/overview.tsx',
    description: 'The canonical export contains customer-request, views, booked, history, and chart values that are absent from the current safe Provider contract.',
    requiredRepair: 'Obtain an approved safe contract projection before rendering those values; do not fabricate dashboard statistics.'
  });
  return defects;
}

function laneFor(screenId) {
  if (SCREEN_IDS.indexOf(screenId) < 14) return 'provider_property_entry';
  if (SCREEN_IDS.indexOf(screenId) < 20) return 'provider_operations';
  return 'provider_notifications_settings';
}

const queue = readJson(QUEUE_PATH);
const parity = readJson(PARITY_PATH);
const checkpoint = readJson(CHECKPOINT_PATH);
const laneLedger = readJson(LANE_PATH);
const providerRowsBefore = queue.screens.filter(row => SCREEN_IDS.includes(row.screenId));
const parityProviderRowsBefore = parity.rows.filter(row => SCREEN_IDS.includes(row.screenId));
if (providerRowsBefore.length !== SCREEN_IDS.length || parityProviderRowsBefore.length !== SCREEN_IDS.length) throw new Error('Provider Wave 2 does not contain exactly 24 canonical rows');
if (providerRowsBefore.some(row => row.clone?.fileKey !== CANONICAL_KEY || row.clone?.fileKey === FORBIDDEN_KEY)) throw new Error('Provider queue contains an invalid or forbidden Figma key');
if (parityProviderRowsBefore.some(row => row.exactCloneNodeId === undefined)) throw new Error('Provider parity rows are missing exact clone node metadata');

const providerRows = providerRowsBefore.map(row => {
  const id = row.screenId;
  const evidenceDir = `${EVIDENCE_ROOT}/${id}`;
  const captures = [];
  for (const locale of ['ar', 'en']) {
    const fileName = ACTUAL_FILENAMES[id]?.[locale];
    if (fileName !== undefined) {
      const source = findByName(fileName);
      captures.push(runtimeCapture(id, locale, source, 'e2e-2026-08-29'));
    } else {
      captures.push(runtimeCapture(id, locale, `${evidenceDir}/runtime-after-${locale}.png`, 'direct-2026-08-29'));
    }
  }
  const defects = screenDefects(id);
  const externalBlockers = EXTERNAL_BLOCKERS[id];
  const evidenceFile = `${evidenceDir}/coordinator-reconciliation.json`;
  const before = fs.existsSync(absolute(`${evidenceDir}/runtime-before-ar.png`))
    ? [`${evidenceDir}/runtime-before-ar.png`, `${evidenceDir}/runtime-before-en.png`]
    : null;
  const screenshotFailures = captures.filter(capture => capture.visual !== null).map(capture => ({
    locale: capture.locale,
    expected: capture.visual.expected,
    actual: capture.visual.actual,
    differentPixels: capture.visual.differentPixels,
    ratio: capture.visual.ratio,
    errorContext: capture.visual.errorContext
  }));
  const directOnly = captures.every(capture => capture.captureMode.startsWith('direct'));
  const screenEvidence = {
    schemaVersion: 1,
    screenId: id,
    classification: 'PARTIAL',
    status: 'COORDINATOR_RECONCILED_PARTIAL',
    source: {
      fileKey: CANONICAL_KEY,
      nodeId: row.clone.nodeId,
      route: row.runtime.route,
      role: 'provider',
      device: 'desktop',
      localExport: `${evidenceDir.replace('docs/quality/figma_parity/screens', 'docs/design_sources/final_screens/provider')}.png`,
      localExportSha256: parityProviderRowsBefore.find(parityRow => parityRow.screenId === id)?.sourceChecksum ?? null,
      reviewed: true
    },
    runtime: {
      approvedLocaleScope: ['ar-RTL', 'en-LTR'],
      excludedLocales: ['zh-CN'],
      captures,
      beforeCapture: before === null
        ? { status: 'NOT_AVAILABLE', reason: 'No pre-Provider-lane capture was available; no before claim is made.' }
        : { status: 'PRESERVED', paths: before },
      reachedInCombinedE2E: !directOnly,
      directCaptureReason: directOnly ? 'PRV-22-2 and PRV-22-3 are captured by a separate deterministic settings-tab harness because the sequential account screenshot aborts first.' : null
    },
    functional: {
      status: 'PASS_FOR_EXECUTED_ASSERTIONS',
      focusedTests: FOCUSED_TESTS[id],
      note: directOnly
        ? 'Focused AR/EN settings assertions and direct deterministic tab capture completed; the combined E2E sequence did not reach this tab after the PRV-22-1 screenshot failure.'
        : 'The combined E2E functional and permission assertions passed before the no-update screenshot assertion failed.'
    },
    visual: {
      status: 'OPEN',
      snapshotsUpdated: false,
      screenshotFailures,
      directReview: 'Reviewed against the approved local Provider export and preserved runtime evidence. The current visual gate is not closure-eligible because no-update screenshots show material geometry/content differences.',
      repoOwnedDefects: defects,
      externalBlockers
    },
    repairs: REPAIRED_FILES[id],
    evidenceFiles: [evidenceFile, `${evidenceDir}/review.json`].filter(file => fs.existsSync(absolute(file))),
    constraints: {
      zhCN: 'Excluded from execution and untouched.',
      admin: 'Unopened and unmodified.',
      snapshots: 'No snapshot was updated.'
    }
  };
  writeJson(evidenceFile, screenEvidence);
  return {
    ...row,
    deterministicState: { ...row.deterministicState, status: 'CAPTURED_AFTER_REPAIR', capturedAt: NOW, seed: 'provider-wave-2-existing-deterministic-fixtures' },
    evidenceDir,
    evidence: {
      ...row.evidence,
      figmaContext: `${evidenceDir}/coordinator-reconciliation.json`,
      figmaScreenshot: screenEvidence.source.localExport,
      runtimeBefore: before,
      structuredVisualComparison: evidenceFile,
      functionalApiComparison: 'agent_pack/08_reality_sync/PROVIDER_WAVE_2_FINAL_RECONCILIATION_2026-08-29.json',
      defects: defects.map(defect => defect.description),
      repairedFiles: REPAIRED_FILES[id],
      runtimeAfter: captures.map(capture => capture.runtimePath),
      reviewedDiff: evidenceFile,
      focusedTests: FOCUSED_TESTS[id],
      accessibility: 'Provider AR/EN landmark, focus, action-gating, and safe-projection assertions passed where the screen flow reached them.'
    },
    classification: 'PARTIAL',
    processedAt: NOW,
    notes: [...(row.notes ?? []), 'Provider Wave 2 coordinator reconciliation: PARTIAL_VISUAL_GATE; no snapshots updated; Admin unopened.']
  };
});

const oldQueueReconciliation = queue.reconciliation;
const oldQueueFinalReconciliation = queue.finalReconciliation;
const providerDecisions = providerRows.map(row => ({
  sequence: row.sequence,
  screenId: row.screenId,
  status: 'PARTIAL_VISUAL_GATE',
  classification: 'PARTIAL',
  evidenceDir: row.evidenceDir,
  cloneNode: row.clone.nodeId,
  runtimeRoute: row.runtime.route,
  evidenceComplete: true,
  closureEligible: false
}));
queue.screens = queue.screens.map(row => SCREEN_IDS.includes(row.screenId) ? providerRows.find(next => next.screenId === row.screenId) : row);
queue.executionPaused = false;
queue.coordinatorTaskId = 'frontend_101';
queue.implementationMode = 'provider_wave_2';
queue.executionMode = 'provider_wave_2';
queue.cursor = {
  phase: 'provider-wave-2-closure-blocked',
  taskId: 'frontend_101',
  currentScreenId: 'PRV-22-3',
  currentSequence: 65,
  nextScreenId: null,
  nextAction: 'Provider Wave 2 is fully reconciled as PARTIAL_VISUAL_GATE; do not open Admin until visual/contract blockers are resolved.'
};
queue.counts = {
  ...queue.counts,
  processed: 65,
  pending: 66,
  partial: 65,
  verifiedWithoutChange: 0,
  repaired: 0,
  blockedSource: queue.counts.blockedSource,
  blockedContract: queue.counts.blockedContract,
  unreviewed: 66
};
queue.discoveryHalt = {
  ...queue.discoveryHalt,
  halted: true,
  haltedBeforeScreenId: null,
  haltedBeforeCloneNode: null,
  haltedBeforeRuntimeRoute: null,
  reason: 'Provider Wave 2 reached all 24 screens but remains closure-blocked by no-update visual mismatches, the shared navigation-icon residual, and exact contract boundaries. Admin remains unopened.',
  historicalDiscoveryHalt: queue.discoveryHalt.historicalDiscoveryHalt
};
queue.repairQueue = {
  taskId: 'frontend_101',
  mode: 'provider_wave_2_reconciliation',
  pass: 1,
  status: 'BLOCKED',
  owner: 'Coordinator',
  scope: 'Reconcile PRV-01 through PRV-24 in Provider-only AR/EN desktop scope with safe contracts, interaction/accessibility/security evidence, and no snapshot updates.',
  screenIds: providerDecisions,
  nextScreenId: null,
  nextSequence: null,
  haltBeforeScreenId: null,
  blockers: [
    'Combined Provider AR/EN no-update E2E: 26 passed, 44 screenshot assertions failed; every failure is visual-only.',
    'The shared ProviderNavigation still renders text glyphs instead of the approved navigation icon treatment.',
    'Several canonical content fields are absent from the current safe Provider contracts; values were left unavailable rather than fabricated.',
    'PRV-22-2 and PRV-22-3 required separate deterministic tab captures because the sequential settings test stops at the PRV-22-1 screenshot assertion.'
  ],
  historicalQueue: queue.repairQueue?.historicalQueue ?? queue.historicalRepairQueue
};
queue.historicalWave1Reconciliation ??= oldQueueReconciliation;
queue.historicalWave1FinalReconciliation ??= oldQueueFinalReconciliation;
queue.providerWave2Reconciliation = {
  reportPath: REPORT_PATH,
  taskId: 'frontend_101',
  decision: 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED',
  screenCount: 24,
  processed: 24,
  verified: 0,
  verifiedNoChange: 0,
  partial: 24,
  closureEligible: 0,
  approvedLocaleScope: ['ar-RTL', 'en-LTR'],
  excludedLocales: ['zh-CN'],
  adminOpened: false,
  updatedAt: NOW
};
queue.providerWave2FinalReconciliation = queue.providerWave2Reconciliation;
writeJson(QUEUE_PATH, queue);

const parityRowsBeforeNonProvider = JSON.stringify(parity.rows.filter(row => !SCREEN_IDS.includes(row.screenId)));
parity.rows = parity.rows.map(row => {
  if (!SCREEN_IDS.includes(row.screenId)) return row;
  const next = providerRows.find(providerRow => providerRow.screenId === row.screenId);
  const evidence = readJson(`${next.evidenceDir}/coordinator-reconciliation.json`);
  const firstCapture = evidence.runtime.captures[0];
  return {
    ...row,
    directScreenshotEvidence: true,
    runtimeBeforeEvidence: evidence.runtime.beforeCapture.status === 'PRESERVED' ? evidence.runtime.beforeCapture.paths.join(';') : null,
    runtimeAfterEvidence: evidence.runtime.captures.map(capture => capture.runtimePath).join(';'),
    visualDiffEvidence: `${next.evidenceDir}/coordinator-reconciliation.json`,
    visualReviewStatus: 'REVIEWED_PROVIDER_WAVE_2_PARTIAL_VISUAL_GATE',
    runtimeEvidence: {
      approvedLocaleScope: ['ar', 'en'],
      excludedLocales: ['zh-CN'],
      captures: evidence.runtime.captures,
      reviewPath: `${next.evidenceDir}/coordinator-reconciliation.json`,
      evidenceComplete: true
    },
    materialDefects: evidence.visual.repoOwnedDefects.map(defect => defect.description).concat(evidence.visual.externalBlockers),
    coordinatorReconciliation: {
      reportPath: REPORT_PATH,
      taskId: 'frontend_101',
      status: 'PARTIAL_VISUAL_GATE',
      classification: 'PARTIAL',
      evidenceComplete: true,
      closureEligible: false,
      latestMetrics: evidence.runtime.captures.map(capture => ({
        locale: capture.locale,
        width: capture.width,
        height: capture.height,
        expected: capture.visual?.expected ?? null,
        materialDifferenceRatio: capture.visual?.ratio ?? null,
        captureMode: capture.captureMode
      })),
      reviewedAt: NOW
    }
  };
});
if (JSON.stringify(parity.rows.filter(row => !SCREEN_IDS.includes(row.screenId))) !== parityRowsBeforeNonProvider) throw new Error('Non-Provider parity rows changed during Provider reconciliation');
parity.updatedAt = NOW;
parity.coordinatorReconciliation = {
  ...parity.coordinatorReconciliation,
  providerWave2: {
    reportPath: REPORT_PATH,
    taskId: 'frontend_101',
    decision: 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED',
    screenCount: 24,
    closureEligible: 0,
    adminOpened: false,
    approvedLocaleScope: ['ar-RTL', 'en-LTR'],
    excludedLocales: ['zh-CN'],
    updatedAt: NOW
  }
};
parity.providerWave2Reconciliation = parity.coordinatorReconciliation.providerWave2;
writeJson(PARITY_PATH, parity);

const historicalCheckpointQueue = checkpoint.screenExecutionQueue;
checkpoint.wave1TerminalMarker ??= 'WAVE_1_RECONCILED_PROVIDER_READY';
checkpoint.wave1Status ??= checkpoint.status;
checkpoint.wave1ScreenExecutionQueue ??= historicalCheckpointQueue;
checkpoint.currentTask = 'frontend_101';
checkpoint.coordinatorTaskId = 'frontend_101';
checkpoint.status = 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED';
checkpoint.lastCompletedIndependentWork = 'Provider Wave 2 PRV-01 through PRV-24 was reconciled in approved AR/EN desktop scope with functional/security evidence preserved; closure remains blocked by the final no-update visual gate and recorded contract/shared-icon defects.';
checkpoint.remainingIndependentWork = [
  'Resolve the shared ProviderNavigation icon treatment against an approved Provider asset/implementation.',
  'Obtain approved safe Provider contract projections for canonical fields currently unavailable, then rerun affected visual checks.',
  'Rerun the combined Provider no-update AR/EN visual gate after bounded repairs without updating snapshots.',
  'Keep Admin unopened until Provider closure is eligible.'
];
checkpoint.screenExecutionQueue = {
  path: QUEUE_PATH,
  phase: 'provider-wave-2-closure-blocked',
  paused: true,
  processed: 65,
  verifiedWithoutChange: 0,
  repaired: 0,
  partial: 65,
  blockedSource: queue.counts.blockedSource,
  unreviewed: 66,
  nextScreenId: null,
  nextCloneNode: null,
  nextRuntimeRoute: null
};
checkpoint.providerWave2 = {
  reportPath: REPORT_PATH,
  canonicalFigmaFileKey: CANONICAL_KEY,
  forbiddenFigmaFileKey: FORBIDDEN_KEY,
  status: 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED',
  decision: 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED',
  screenCount: 24,
  closureEligible: 0,
  providerImplementationStarted: true,
  adminImplementationStarted: false,
  adminOpened: false,
  approvedLocaleScope: ['ar-RTL', 'en-LTR'],
  excludedLocales: ['zh-CN'],
  updatedAt: NOW
};
checkpoint.adminStartAllowed = false;
checkpoint.providerImplementationStarted = true;
checkpoint.adminImplementationStarted = false;
checkpoint.approvedLocaleScope = ['ar-RTL', 'en-LTR'];
checkpoint.excludedLocales = ['zh-CN'];
writeJson(CHECKPOINT_PATH, checkpoint);

const sharedChangeRequests = [
  {
    requestId: 'provider_property_entry-to-coordinator-overview',
    requester: 'provider_property_entry',
    screens: ['PRV-01'],
    targetFile: 'apps/web/src/features/provider/overview.tsx',
    defect: 'PRV-01 required the eight-metric dashboard, chart, quick-actions panel, recent-properties table, and canonical navigation treatment; the safe Provider contract does not supply all canonical statistics.',
    minimalChange: 'Coordinator-owned bounded JSX/markup repair using existing approved components, tokens, assets, safe projections, and current authenticated-provider/status guards; do not add phone identity, private fields, routes, or API behavior.',
    expectedEffect: 'Align the Provider dashboard structure and navigation hooks for AR/EN without changing ownership, permission, or fail-closed behavior.',
    status: 'APPLIED_VERIFIED_PARTIAL',
    resolution: 'Dashboard structure, safe unavailable states, table semantics, and eight-card layout were applied; exact canonical values and icon treatment remain open.',
    securityRisk: 'Low if the existing session guard, authorization header, application-status gating, and safe projections remain unchanged.'
  },
  {
    requestId: 'provider_notifications_settings-to-coordinator-shell',
    requester: 'provider_notifications_settings',
    screens: ['PRV-21', 'PRV-22-1', 'PRV-22-2', 'PRV-22-3'],
    targetFile: 'apps/web/src/features/provider/styles.css',
    defect: 'The shared Provider shell required the light right-side AR rail/left-side EN rail and canonical desktop shell geometry, while the prior shell was dark and opposite.',
    minimalChange: 'Align only shared shell geometry, rail placement, colors, and active navigation treatment with approved local exports while preserving routes, authorization, ownership, and AR/EN direction.',
    expectedEffect: 'All Provider screens share the bounded shell repair without changing lane-owned data projections or mutations.',
    status: 'APPLIED_VERIFIED_PARTIAL',
    resolution: 'Light shell, direction-aware rail placement, active treatment, metric/insight geometry, and bounded settings layout were applied; exact icon assets and final snapshot parity remain open.',
    securityRisk: 'Low; navigation routes, provider authorization, locale handling, and unavailable actions remain unchanged.'
  }
];
laneLedger.updatedAt = NOW;
laneLedger.coordinatorTaskId = 'frontend_101';
laneLedger.status = 'PARTIAL_VISUAL_GATE';
laneLedger.currentScreenId = 'PRV-22-3';
laneLedger.nextScreenId = null;
laneLedger.adminOpened = false;
laneLedger.providerImplementationStarted = true;
laneLedger.sharedChangeQueue = sharedChangeRequests;
laneLedger.laneStatuses = {
  provider_property_entry: 'PARTIAL_VISUAL_GATE',
  provider_operations: 'PARTIAL_VISUAL_GATE',
  provider_notifications_settings: 'PARTIAL_VISUAL_GATE'
};
for (const lane of laneLedger.lanes) {
  lane.status = 'PARTIAL_VISUAL_GATE';
  const laneRows = providerDecisions.filter(row => lane.screenRange.includes(row.screenId));
  lane.cursor = {
    ...lane.cursor,
    screenId: laneRows.at(-1).screenId,
    node: laneRows.at(-1).cloneNode,
    route: laneRows.at(-1).runtimeRoute
  };
  lane.screenDecisions = Object.fromEntries(laneRows.map(row => [row.screenId, {
    status: row.status,
    classification: row.classification,
    closureEligible: false,
    evidencePath: `${row.evidenceDir}/coordinator-reconciliation.json`
  }]));
}
laneLedger.cursor = { screenId: 'PRV-22-3', node: '6028:12067', route: '/provider/settings', role: 'provider', directions: ['rtl', 'ltr'], devices: ['desktop'] };
laneLedger.closureDecision = {
  status: 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED',
  reportPath: REPORT_PATH,
  verifiedScreens: 0,
  partialScreens: 24,
  adminReady: false,
  updatedAt: NOW
};
writeJson(LANE_PATH, laneLedger);

const reportScreens = providerRows.map(row => {
  const evidence = readJson(`${row.evidenceDir}/coordinator-reconciliation.json`);
  return {
    screenId: row.screenId,
    sequence: row.sequence,
    node: row.clone.nodeId,
    route: row.runtime.route,
    role: 'provider',
    device: 'desktop',
    directions: ['rtl', 'ltr'],
    classification: 'PARTIAL',
    status: 'PARTIAL_VISUAL_GATE',
    closureEligible: false,
    evidenceDir: row.evidenceDir,
    captures: evidence.runtime.captures.map(capture => ({ locale: capture.locale, direction: capture.direction, path: capture.runtimePath, sha256: capture.sha256, width: capture.width, height: capture.height, captureMode: capture.captureMode, visual: capture.visual })),
    externalBlockers: evidence.visual.externalBlockers,
    repositoryOwnedDefects: evidence.visual.repoOwnedDefects.map(defect => ({ id: defect.id, targetFile: defect.targetFile, description: defect.description })),
    focusedTests: FOCUSED_TESTS[row.screenId]
  };
});

const report = {
  schemaVersion: 1,
  reportId: 'PROVIDER_WAVE_2_FINAL_RECONCILIATION_2026-08-29',
  generatedAt: NOW,
  taskId: 'frontend_101',
  decision: 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED',
  finalMarker: 'PROVIDER_WAVE_FINAL_CLOSURE_BLOCKED',
  canonicalSource: { fileKey: CANONICAL_KEY, forbiddenFileKey: FORBIDDEN_KEY, sourceMode: 'approved local Provider exports and exact queue metadata; direct Figma retrieval was not required' },
  scope: { screenIds: SCREEN_IDS, screenCount: 24, providerOnly: true, approvedLocales: ['ar-RTL', 'en-LTR'], excludedLocales: ['zh-CN'], deviceScope: ['desktop'], adminOpened: false, adminImplementationStarted: false },
  totals: { verified: 0, verifiedNoChange: 0, repairedVerified: 0, partial: 24, closureEligible: 0, externalPrerequisiteScreens: Object.values(EXTERNAL_BLOCKERS).filter(blockers => blockers.length > 0).length, repositoryOwnedSharedResidualScreens: 24 },
  screens: reportScreens,
  gateResults: {
    focusedProviderVitest: { command: 'node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/tests/provider-account.vitest.test.tsx apps/web/tests/provider-advertising.vitest.test.tsx apps/web/tests/provider-customer-requests.vitest.test.tsx apps/web/tests/provider-notifications-settings.vitest.test.tsx apps/web/tests/provider-organization-documents.vitest.test.tsx apps/web/tests/provider-overview.vitest.test.tsx apps/web/tests/provider-projects.vitest.test.tsx apps/web/tests/provider-properties.vitest.test.tsx apps/web/tests/provider-property-advanced.vitest.test.tsx apps/web/tests/provider-property-completion.vitest.test.tsx apps/web/tests/provider-property-state.vitest.test.tsx apps/web/tests/provider-property-wizard.vitest.test.tsx apps/web/tests/provider-review.vitest.test.tsx apps/web/tests/provider-type.vitest.test.tsx apps/web/tests/provider-viewings.vitest.test.tsx --run -t \'^(?!.*zh-CN).*$\'', exitCode: 0, result: '15 files; 122 AR/EN tests passed; 16 zh-CN parameterized cases skipped by the direct Node invocation.' },
    focusedProviderApi: { command: 'node --import tsx --test tests/provider/advertising-models.test.ts tests/provider/contracts.test.ts tests/provider/models.test.ts tests/provider/request-crm.test.ts tests/provider/requirements.test.ts tests/provider/router.test.ts tests/provider/service.test.ts', cwd: 'apps/api', exitCode: 0, result: '27 passed, 0 failed' },
    typecheck: { command: 'npm.cmd run typecheck', exitCode: 0, result: 'syntax, contracts, API, and web typechecks passed' },
    lint: { command: 'npm.cmd run lint', exitCode: 0, result: 'workspace check and ESLint passed with zero warnings' },
    openapi: { command: 'npm.cmd run openapi:validate', exitCode: 0, result: 'OPENAPI_VALID' },
    postman: { command: 'npm.cmd run postman:validate', exitCode: 0, result: 'POSTMAN_VALID' },
    apiInventory: { command: 'npm.cmd run api:inventory', exitCode: 0, result: 'Provider routes report implemented' },
    bundle: { command: 'npm.cmd run test:bundle --workspace apps/web', exitCode: 0, result: 'javascript 1601680/2560000; stylesheet 409582/409600; largest JavaScript 453801/665600' },
    combinedProviderE2E: { command: 'WEB_BASE_URL=http://127.0.0.1:4175 npm.cmd exec --workspace apps/web -- playwright test --config playwright.config.ts --project=desktop-ar --project=desktop-en --workers=1 [Provider Wave 2 specs]', exitCode: 1, total: 70, passed: 26, failed: 44, failureType: 'visual-only no-update screenshot assertions', snapshotsUpdated: false, result: 'All 44 failures occurred at toHaveScreenshot; functional/action/permission assertions before those points passed. PRV-22-2 and PRV-22-3 were separately captured because the sequential settings flow stopped at PRV-22-1.' },
    accessibility: { status: 'PASS_FOR_EXECUTED_PROVIDER_ASSERTIONS', result: 'Provider landmark, focus, action-gating, safe-projection, and keyboard assertions passed in the reached AR/EN E2E cases and focused Vitest coverage; no zh-CN/Admin accessibility run was made.' },
    securityAndOwnership: { status: 'PASS_FOR_EXECUTED_PROVIDER_ASSERTIONS', result: 'Provider bearer role gates, owner-scoped queries/mutations, IDOR/permission denial, redacted projections, upload/document authorization, and fail-closed unavailable actions passed in focused API/web tests.' },
    performance: { status: 'BUNDLE_BUDGET_PASS_PROVIDER_SPECIFIC_BROWSER_PERFORMANCE_NOT_APPLICABLE', result: 'Provider is desktop-only in the registry; the repository performance spec covers Public routes, while the Provider bundle budget passed.' }
  },
  visualClosure: { status: 'OPEN', snapshotsUpdated: false, evidencePolicy: 'No baseline or snapshot was updated. Every open mismatch is recorded with expected/actual dimensions and ratios when a screenshot assertion was reached.' },
  identityAndSecurity: {
    providerIdentity: 'email-only/passwordless; no phone field is used for Provider registration, login, OTP, grants, or projections',
    verificationRoute: '/auth/verify-email canonical; /auth/verify-phone remains browser legacy redirect only with no phone state',
    optionalContact: 'Phone/WhatsApp only where an approved business/contact contract supports it; no account identity phone was added',
    mapUrl: 'absolute HTTPS only, <=2048 characters; relative/javascript/data/http/unsafe values rejected; locationId/coordinates preserved; no fetch/geocode/follow/preview/synthesis',
    protectedData: 'No internalNotes, assignedTo, auditData, storageKey, accessToken, refreshToken, resolver, or administrative fields rendered in Provider projections'
  },
  sharedChangeRequests,
  changedFiles: {
    coordinatorOwned: ['apps/web/src/features/frontend_foundation/app.tsx', 'apps/web/src/features/provider/copy.ts', 'apps/web/src/features/provider/overview.tsx', 'apps/web/src/features/provider/styles.css', 'agent_pack/08_reality_sync/PROVIDER_WAVE_2_COORDINATOR.md', 'agent_pack/08_reality_sync/PROVIDER_WAVE_2_LANE_LEDGER.json', 'agent_pack/08_reality_sync/PROVIDER_WAVE_2_FINAL_RECONCILIATION_2026-08-29.json'],
    laneOwned: ['apps/web/src/features/provider/**', 'apps/web/src/features/provider_property/**', 'apps/web/src/features/provider_auth/**', 'apps/web/tests/**'],
    evidence: ['docs/quality/figma_parity/screens/PRV-01/** through PRV-22-3/**'],
    historicalWave1: 'preserved; no Wave 1 evidence or snapshots were deleted or rewritten'
  },
  snapshots: { updated: false, updatedFiles: [], note: 'Checked-in snapshots remain unchanged, including zh-CN snapshots.' },
  cleanup: { temporarySettingsCaptureHelper: 'deleted after direct PRV-22-2/PRV-22-3 captures', testResults: 'preserved as ignored failure artifacts', localServer: '4175 used for capture and must be stopped after final audit; unrelated 4173 process was not touched' },
  agentPack: { coordinatorTaskId: 'frontend_101', syncPackExitCode: 0, auditPackExitCode: 0, finalCursor: { phase: 'provider-wave-2-closure-blocked', currentScreenId: 'PRV-22-3', currentSequence: 65, nextScreenId: null }, adminReady: false },
  tooling: { browserSkill: 'In-app browser REPL failed with missing sandboxPolicy; shell Playwright was used for deterministic local capture.', figma: 'Local canonical exports and exact inventory node IDs were used; no forbidden Figma key was opened.' },
  wave1Preservation: { terminalMarker: 'WAVE_1_RECONCILED_PROVIDER_READY', finalClosurePath: 'agent_pack/08_reality_sync/WAVE_1_FINAL_VISUAL_CLOSURE_2026-08-29.json', providerStartedAfterCheckpoint: true, adminStarted: false }
};
writeJson(REPORT_PATH, report);

console.log(JSON.stringify({
  report: REPORT_PATH,
  providerScreens: SCREEN_IDS.length,
  providerRowsUpdated: providerRows.length,
  parityRowsPreserved: parity.rows.filter(row => !SCREEN_IDS.includes(row.screenId)).length,
  decision: report.decision,
  adminOpened: false
}, null, 2));
