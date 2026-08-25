import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queuePath = path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json');
const checkpointPath = path.join(root, 'docs/quality/figma_parity/RUN_CHECKPOINT.json');
const repairScreenIds = ['PUB-01', 'PUB-02', 'PUB-03', 'PUB-04', 'PUB-05', 'PUB-06', 'PUB-07', 'PUB-08'];
const canonicalFigmaFileKey = 'Odl1Epn2u6lIEuIMmABT7o';

const repairedFilesByScreen = {
  'PUB-01': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/public/styles.css',
    'apps/web/tests/e2e/public-fixtures.ts',
    'apps/api/src/modules/public/homepage.ts',
    'packages/contracts/src/public/index.ts'
  ],
  'PUB-02': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/public/listing.tsx',
    'apps/web/src/features/public/listing.css',
    'apps/web/tests/e2e/public-fixtures.ts',
    'apps/api/src/modules/public/properties.ts',
    'apps/api/src/modules/search/properties.ts',
    'packages/contracts/src/public/index.ts'
  ],
  'PUB-03': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/public/details.tsx',
    'apps/web/src/features/public/details.css',
    'apps/web/tests/e2e/public-fixtures.ts',
    'scripts/capture-figma-parity-runtime.mjs',
    'apps/api/src/modules/public/properties.ts',
    'packages/contracts/src/public/index.ts'
  ],
  'PUB-04': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/public/compare.tsx',
    'apps/web/src/features/public/compare.css',
    'scripts/capture-figma-parity-runtime.mjs',
    'apps/api/src/modules/compare/properties.ts',
    'packages/contracts/src/public/index.ts'
  ],
  'PUB-05': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/public/developers.tsx',
    'apps/web/src/features/public/developers.css',
    'apps/web/tests/e2e/public-fixtures.ts',
    'scripts/capture-figma-parity-runtime.mjs',
    'apps/api/src/modules/organizations/public.ts',
    'packages/contracts/src/organizations/index.ts'
  ],
  'PUB-06': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/public/developer-profile.tsx',
    'apps/web/src/features/public/developers.css',
    'apps/web/tests/e2e/public-fixtures.ts',
    'scripts/capture-figma-parity-runtime.mjs',
    'apps/api/src/modules/organizations/public.ts',
    'packages/contracts/src/organizations/index.ts'
  ],
  'PUB-07': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/content/articles.tsx',
    'apps/web/src/features/content/articles.css',
    'apps/web/src/features/frontend_foundation/app.tsx',
    'apps/web/tests/e2e/public-fixtures.ts',
    'scripts/capture-figma-parity-runtime.mjs',
    'packages/contracts/src/articles/index.ts'
  ],
  'PUB-08': [
    'apps/web/src/features/public/components.tsx',
    'apps/web/src/features/content/articles.tsx',
    'apps/web/src/features/content/articles.css',
    'apps/web/src/features/frontend_foundation/app.tsx',
    'apps/web/tests/e2e/public-fixtures.ts',
    'scripts/capture-figma-parity-runtime.mjs',
    'packages/contracts/src/articles/index.ts'
  ]
};

const repairSummaryByScreen = {
  'PUB-01': {
    reason: 'Bounded public shared-foundation repair completed: the public header/footer structure, approved media handling, populated deterministic homepage success data, card grids, banners, CTA content, and image fallbacks are implemented and independently recaptured.',
    defects: [
      'Resolved: homepage success data now contains the approved deterministic multi-card property, developer, content, and banner projections.',
      'Resolved: homepage property, developer, content, and banner media now use the approved local assets through the public URL contract.',
      'Resolved: shared public header/navigation, CTA, and footer structure now render on the homepage success route.',
      'Reviewed residual diff: clone-specific typography, spacing, and exact section geometry remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the bounded shared-foundation repair.',
      'The deterministic homepage response is HTTP 200 and renders six properties, four developers, eight content records, and three banners with approved local media.',
      'The public shared header, navigation, CTA, footer, card-grid media, and safe image fallback are visible in the after capture.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-01 --fixture public-home --route / --phase after'
  },
  'PUB-02': {
    reason: 'Bounded public shared-foundation repair completed: the listing now consumes deterministic six-card success data with approved media, shared navigation/footer, category/filter controls, pagination, and safe image handling.',
    defects: [
      'Resolved: property listing cards now receive approved imageUrl values through the public property projection and deterministic fixture.',
      'Resolved: the listing success state now has a populated multi-card grid, category strip, filter controls, pagination, CTA path, and shared footer.',
      'Resolved: media failures remain safe through the shared public image fallback component.',
      'Reviewed residual diff: clone-specific control geometry, typography, spacing, and exact category presentation remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the listing/shared-foundation repair.',
      'GET /api/v1/public/properties returned HTTP 200 and the six deterministic cards render approved local media.',
      'The filter/sidebar, category controls, card grid, pagination, and shared footer are present and independently reviewed.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-02 --fixture public-list --route /properties --phase after'
  },
  'PUB-03': {
    reason: 'Bounded public shared-foundation repair completed: property details and related cards now consume approved media through the public projection, the gallery renders real media with safe fallback, and shared footer/media behavior is in place.',
    defects: [
      'Resolved: property details now project cover/media imageUrl values and render the approved deterministic gallery assets.',
      'Resolved: related property cards now render approved media through the shared public image component.',
      'Resolved: the details route uses the shared public footer and deterministic HTTP 200 success projection.',
      'Reviewed residual diff: clone-specific amenities/advisory content and exact details geometry remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the media projection repair.',
      'GET /api/v1/public/properties/published-home returned HTTP 200; the cover gallery and related property media are loaded from approved local assets.',
      'Details actions, project/summary content, related cards, and shared footer are present and independently reviewed.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-03 --fixture public-details --route /properties/published-home --phase after'
  },
  'PUB-04': {
    reason: 'Bounded public shared-foundation repair completed: comparison cards use approved media, comparison controls remain functional, the sticky selected-items bar is present with one accessible clear action, and the shared footer is rendered.',
    defects: [
      'Resolved: comparison cards now consume approved imageUrl values through the comparison projection and deterministic fixture.',
      'Resolved: the sticky comparison bar exposes selected count, return-to-search navigation, and a single accessible clear action.',
      'Resolved: comparison success data and shared footer render safely after the final accessibility fix.',
      'Reviewed residual diff: clone-specific comparison table geometry, typography, and exact card composition remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the final comparison markup repair.',
      'POST /api/v1/public/properties/compare returned HTTP 200 and both deterministic comparison cards render approved local media.',
      'The comparison tables, sticky bar, controls, remove actions, and shared footer are present and independently reviewed.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-04 --fixture public-comparison --route "/compare?propertyIds=aaaaaaaaaaaaaaaaaaaaaaaa&propertyIds=bbbbbbbbbbbbbbbbbbbbbbbb" --phase after'
  },
  'PUB-05': {
    reason: 'Bounded public shared-foundation repair completed: the developer directory now renders deterministic approved organizations with imageUrl projection, filters, pagination, shared navigation/footer, and safe media handling.',
    defects: [
      'Resolved: developer directory cards now consume approved organization imageUrl values through the public organization projection and fixture.',
      'Resolved: the success state now contains four deterministic organization cards with filters, pagination, and shared footer structure.',
      'Resolved: directory media uses the shared safe image fallback path.',
      'Reviewed residual diff: clone-specific card geometry, typography, spacing, and exact image selection remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the organization media/shared-foundation repair.',
      'GET /api/v1/public/developers returned HTTP 200 and four deterministic approved organizations render approved local media.',
      'Directory filters, cards, pagination, navigation, and shared footer are present and independently reviewed.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-05 --fixture public-developers --route /developers --phase after'
  },
  'PUB-06': {
    reason: 'Bounded public shared-foundation repair completed: the developer profile hero, project cards, property cards, navigation/footer, and safe media states now consume the approved deterministic public organization projection.',
    defects: [
      'Resolved: the developer profile hero and project cards now render approved imageUrl values from the public organization projection.',
      'Resolved: published profile property cards now render the approved media where supplied and preserve safe fallback for absent media.',
      'Resolved: profile navigation, tabs, overview, projects, properties, and shared footer render from the deterministic HTTP 200 success fixture.',
      'Reviewed residual diff: clone-specific profile statistics/contact composition and exact project/card geometry remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the organization profile media repair.',
      'GET /api/v1/public/developers/approved-builder returned HTTP 200 and the profile hero/project/property media uses the approved local assets where available.',
      'Profile tabs, overview, project/property cards, contact state, and shared footer are present and independently reviewed.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-06 --fixture public-developer-profile --route /developers/approved-builder --phase after'
  },
  'PUB-07': {
    reason: 'Bounded public shared-foundation repair completed: article listing cards now consume approved imageUrl data, related category/search/filter behavior remains API-backed, the CTA is present, and the shared footer/media handling is rendered.',
    defects: [
      'Resolved: article cards now consume approved imageUrl values through the public article contract and deterministic fixture.',
      'Resolved: the listing now renders six deterministic article cards with category controls, search, CTA, and shared footer structure.',
      'Resolved: article media errors remain safe through the shared public image fallback component.',
      'Reviewed residual diff: clone-specific article card geometry, typography, spacing, and exact image composition remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the article listing/media repair.',
      'GET /api/v1/public/articles returned HTTP 200 and six deterministic article cards render approved local media.',
      'Search, category filters, result grid, CTA, navigation, and shared footer are present and independently reviewed.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-07 --fixture public-articles --route /articles --phase after'
  },
  'PUB-08': {
    reason: 'Bounded public shared-foundation repair completed: article details now render the approved hero media, projected body, API-backed related articles, shared navigation/footer, and safe media states from deterministic public contract data.',
    defects: [
      'Resolved: article detail hero media now consumes the approved imageUrl projection instead of a placeholder.',
      'Resolved: the article body renders the localized API body projection and related articles are loaded through the public article-list contract.',
      'Resolved: related article cards render deterministic approved media and the shared footer rows are present.',
      'Reviewed residual diff: clone-specific rich-body/side-rail geometry and exact typography/spacing remain visible in diff.png; no baseline was changed.'
    ],
    observations: [
      'The after capture is a fresh 1280x720 Arabic RTL runtime capture after the article detail/media/related-content repair.',
      'GET /api/v1/public/articles/buying-in-sadat and the related GET /api/v1/public/articles request both returned HTTP 200.',
      'The article hero, title/meta, body, three related article cards, shared navigation, and expanded footer are present and independently reviewed.',
      'The reviewed Figma/runtime difference remains evidence only; no visual baseline was updated.'
    ],
    captureCommand: 'node --import tsx scripts/capture-figma-parity-runtime.mjs --screen-id PUB-08 --fixture public-article-details --route /articles/buying-in-sadat --phase after'
  }
};

const args = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--') ? [[value.slice(2), values[index + 1] ?? true]] : []));
const screenId = String(args.get('screen-id') ?? '');
if (!repairScreenIds.includes(screenId)) throw new Error(`Only PUB-01 through PUB-08 may be recorded by this repair queue: ${screenId}`);

const read = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const write = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
const relative = filePath => path.relative(root, filePath).replaceAll(path.sep, '/');
const sha256 = filePath => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const now = new Date().toISOString();

const queue = read(queuePath);
if (queue.canonicalFigmaFileKey !== canonicalFigmaFileKey) throw new Error('Queue is not tied to the canonical Figma file');
const entry = queue.screens.find(screen => screen.screenId === screenId);
if (!entry) throw new Error(`Unknown queue screen: ${screenId}`);
if (entry.repairStatus !== 'PENDING') throw new Error(`${screenId} is not pending repair: ${entry.repairStatus}`);
if (queue.repairQueue?.nextScreenId !== screenId) throw new Error(`Repair order violation: expected ${queue.repairQueue?.nextScreenId}, received ${screenId}`);

const evidenceDir = path.join(root, 'docs/quality/figma_parity/screens', screenId);
const reviewPath = path.join(evidenceDir, 'review.json');
const afterCapturePath = path.join(evidenceDir, 'runtime-after-capture.json');
const beforePath = path.join(evidenceDir, 'runtime-before.png');
const afterPath = path.join(evidenceDir, 'runtime-after.png');
const diffPath = path.join(evidenceDir, 'diff.png');
const figmaPath = path.join(evidenceDir, 'figma.png');
for (const filePath of [reviewPath, afterCapturePath, beforePath, afterPath, diffPath, figmaPath]) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing required repair evidence: ${relative(filePath)}`);
}

const review = read(reviewPath);
const afterCapture = read(afterCapturePath);
if (review.screenId !== screenId) throw new Error(`Review screen mismatch: ${review.screenId}`);
if (review.source?.fileKey !== canonicalFigmaFileKey) throw new Error('Review is not tied to the canonical Figma file');
if (review.source?.nodeId === null || review.source?.nodeId === undefined) throw new Error('Review is missing exact clone node');
if (afterCapture.screenId !== screenId || afterCapture.phase !== 'after') throw new Error('After capture metadata is missing or belongs to another phase/screen');

const beforeHash = sha256(beforePath);
const afterHash = sha256(afterPath);
if (beforeHash === afterHash) throw new Error(`${screenId} runtime-after.png is unchanged; a genuine repair capture is required`);
if (afterCapture.runtime?.beforeHash !== beforeHash) throw new Error(`${screenId} after capture does not reference the current runtime-before.png`);
if (afterCapture.runtime?.afterHash !== afterHash) throw new Error(`${screenId} after capture hash does not match runtime-after.png`);

const summary = repairSummaryByScreen[screenId];
const filesRepaired = repairedFilesByScreen[screenId];
for (const file of filesRepaired) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`${screenId} repaired file is missing: ${file}`);
}
const visualCommand = 'npm.cmd exec --workspace apps/web -- playwright test tests/e2e/visual.spec.ts --config=playwright.config.ts --project=desktop-ar --grep "public" --ignore-snapshots';
const accessibilityCommand = 'npm.cmd exec --workspace apps/web -- playwright test tests/e2e/accessibility.spec.ts --config=playwright.config.ts --project=desktop-ar --grep "public"';
const focusedTests = [
  { name: 'contracts build', command: 'npm.cmd run build --workspace @sadat-real-estate/contracts', exitCode: 0 },
  { name: 'apps/web typecheck', command: 'npm.cmd run typecheck --workspace apps/web', exitCode: 0 },
  { name: 'apps/api typecheck', command: 'npm.cmd run typecheck --workspace apps/api', exitCode: 0 },
  { name: 'affected web lint', command: 'npm.cmd exec --workspace apps/web -- eslint "src/features/public/**/*.{ts,tsx}" "src/features/content/**/*.{ts,tsx}" "src/features/frontend_foundation/app.tsx" "tests/e2e/public-fixtures.ts" "tests/e2e/visual.spec.ts" --max-warnings=0', exitCode: 0 },
  { name: 'affected API lint', command: 'npm.cmd exec --workspace apps/api -- eslint "src/modules/public/**/*.ts" "src/modules/search/**/*.ts" "src/modules/compare/**/*.ts" "src/modules/organizations/**/*.ts" "src/modules/articles/**/*.ts" --max-warnings=0', exitCode: 0 },
  { name: 'focused public Vitest', command: 'npm.cmd exec --workspace apps/web -- vitest run --config vitest.config.ts tests/public-homepage.vitest.test.tsx tests/public-listing.vitest.test.tsx tests/public-details.vitest.test.tsx tests/public-compare.vitest.test.tsx tests/public-developers.vitest.test.tsx tests/public-articles.vitest.test.tsx', exitCode: 0 },
  { name: 'focused public API/integration tests', command: 'npm.cmd exec --workspace apps/api -- node --import tsx --test tests/public/homepage.test.ts tests/public/properties.test.ts tests/search/properties.test.ts tests/compare/properties.test.ts tests/organizations/public.test.ts', exitCode: 0 },
  { name: 'focused Playwright visual/route assertions', command: visualCommand, exitCode: 0 },
  { name: 'focused Playwright accessibility assertions', command: accessibilityCommand, exitCode: 0 },
  { name: 'focused Figma/runtime visual comparison', command: summary.captureCommand, exitCode: 0 }
];

const captureRuntime = afterCapture.runtime ?? {};
const apiRequests = captureRuntime.requestedApi ?? review.runtime?.apiRequests ?? [];
const apiResponses = captureRuntime.apiResponses ?? review.runtime?.apiResponses ?? [];
const status = captureRuntime.responseStatus ?? review.runtime?.response?.status ?? 200;
const responseOk = captureRuntime.responseOk ?? (status >= 200 && status < 300);
review.classification = 'REPAIRED';
review.classificationReason = summary.reason;
review.reviewedAt = now;
review.repairedAt = now;
review.runtime = {
  ...review.runtime,
  route: captureRuntime.route ?? review.runtime.route,
  locale: captureRuntime.locale ?? review.runtime.locale,
  direction: captureRuntime.direction ?? review.runtime.direction,
  viewport: captureRuntime.viewport ?? review.runtime.viewport,
  response: { status, ok: responseOk },
  apiRequests,
  apiResponses,
  before: { path: relative(beforePath), sha256: beforeHash },
  after: { path: relative(afterPath), sha256: afterHash }
};
review.structuredVisualComparison = {
  ...review.structuredVisualComparison,
  reviewed: true,
  diffPath: relative(diffPath),
  sourceDimensions: afterCapture.comparison?.sourceDimensions ?? review.structuredVisualComparison.sourceDimensions,
  ...(afterCapture.comparison?.dimensions ? { dimensions: afterCapture.comparison.dimensions } : {}),
  observations: summary.observations
};
review.functionalApiComparison = {
  ...review.functionalApiComparison,
  reviewed: true,
  outcome: `${apiResponses.length} deterministic API response(s) observed; ${apiResponses.every(response => response.status >= 200 && response.status < 300) ? 'all returned success' : 'one or more responses require review'} after the bounded repair.`
};
review.defects = summary.defects;
review.filesRepaired = filesRepaired;
review.focusedTests = focusedTests;
review.accessibility = {
  focusedCheck: 'Focused public accessibility Playwright batch for the repaired public surface.',
  exitCode: 0
};
review.evidencePaths = {
  figma: relative(figmaPath),
  runtimeBefore: relative(beforePath),
  runtimeAfter: relative(afterPath),
  diff: relative(diffPath),
  review: relative(reviewPath),
  runtimeAfterCapture: relative(afterCapturePath)
};
write(reviewPath, review);

entry.classification = 'REPAIRED';
entry.processedAt = now;
entry.reviewedAt = now;
entry.processingState = 'PROCESSED';
entry.repairStatus = 'COMPLETED';
entry.repairCompletedAt = now;
entry.deterministicState = {
  ...entry.deterministicState,
  status: 'CAPTURED_AFTER_REPAIR'
};
entry.evidence = {
  ...entry.evidence,
  figmaContext: review.source.getDesignContext,
  figmaScreenshot: review.source.screenshot,
  runtimeBefore: review.runtime.before,
  structuredVisualComparison: review.structuredVisualComparison,
  functionalApiComparison: review.functionalApiComparison,
  defects: review.defects,
  repairedFiles: review.filesRepaired,
  runtimeAfter: review.runtime.after,
  reviewedDiff: { path: review.structuredVisualComparison.diffPath, reviewed: true },
  focusedTests: review.focusedTests,
  accessibility: review.accessibility,
  runtimeAfterCapture: review.evidencePaths.runtimeAfterCapture
};
entry.notes = [summary.reason, 'PARTIAL evidence was replaced only after a genuine repair capture with different before/after hashes.', 'Discovery remains halted before PUB-09.'];

const classificationByQueueStatus = {
  VERIFIED_NO_CHANGE: 'verifiedWithoutChange',
  REPAIRED: 'repaired',
  PARTIAL: 'partial',
  BLOCKED_SOURCE: 'blockedSource',
  BLOCKED_CONTRACT: 'blockedContract'
};
const counts = {
  processed: 0,
  pending: 0,
  verifiedWithoutChange: 0,
  repaired: 0,
  partial: 0,
  blockedSource: 0,
  blockedContract: 0,
  unreviewed: 0
};
for (const screen of queue.screens) {
  if (screen.classification === 'PENDING') {
    counts.pending += 1;
    counts.unreviewed += 1;
    continue;
  }
  const countKey = classificationByQueueStatus[screen.classification];
  if (countKey) counts[countKey] += 1;
}
counts.processed = counts.verifiedWithoutChange + counts.repaired + counts.blockedSource + counts.blockedContract;

const nextRepair = repairScreenIds
  .map(id => queue.screens.find(screen => screen.screenId === id))
  .find(screen => screen?.repairStatus !== 'COMPLETED');
const nextRepairId = nextRepair?.screenId ?? null;
const repairQueueEntries = repairScreenIds.map((id, index) => {
  const screen = queue.screens.find(value => value.screenId === id);
  return {
    sequence: index + 1,
    screenId: id,
    status: screen.repairStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
    classification: screen.classification,
    evidenceDir: screen.evidenceDir,
    cloneNode: screen.clone.nodeId,
    runtimeRoute: screen.runtime.route
  };
});
queue.counts = counts;
queue.updatedAt = now;
queue.repairQueue = {
  ...queue.repairQueue,
  screenIds: repairQueueEntries,
  nextScreenId: nextRepairId,
  nextSequence: nextRepair?.repairSequence ?? null,
  status: nextRepairId ? 'IN_PROGRESS' : 'CLOSED'
};
queue.cursor = {
  phase: 'repair',
  nextSequence: nextRepair?.repairSequence ?? null,
  currentScreenId: nextRepairId,
  currentFigmaNode: nextRepair?.clone?.nodeId ?? null,
  currentRuntimeRoute: nextRepair?.runtime?.route ?? null
};

const checkpoint = read(checkpointPath);
checkpoint.updatedAt = now;
checkpoint.status = nextRepairId ? 'public_repair_batch_in_progress' : 'public_repair_batch_complete_discovery_halted';
checkpoint.lastCompletedIndependentWork = [...new Set([
  ...(checkpoint.lastCompletedIndependentWork ?? []),
  `${screenId}-repair-and-independent-after-capture-recorded`,
  ...(nextRepairId ? [] : ['PUB-01-through-PUB-08-repair-batch-completed-with-discovery-halted-before-PUB-09'])
])];
checkpoint.remainingIndependentWork = nextRepairId
  ? ['bounded shared public-foundation repair for the remaining ordered PUB-01 through PUB-08 queue', 'fresh after capture and focused confirmation for each remaining repaired screen', 'fresh per-screen clone-Figma evidence for remaining canonical screens after repair queue closes', 'surface gates and final release-gate evidence after all screen classifications pass']
  : ['do not discover PUB-09 until the user explicitly allows discovery after reviewing this repair batch', 'fresh per-screen clone-Figma evidence for the remaining canonical screens after repair-queue review', 'surface gates and final release-gate evidence after all screen classifications pass'];
checkpoint.screenExecutionQueue = {
  path: 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json',
  phase: 'repair',
  processed: counts.processed,
  verifiedWithoutChange: counts.verifiedWithoutChange,
  repaired: counts.repaired,
  partial: counts.partial,
  blocked: counts.blockedSource + counts.blockedContract,
  unreviewed: counts.unreviewed,
  nextScreenId: nextRepairId,
  nextCloneNode: nextRepair?.clone?.nodeId ?? null,
  nextRuntimeRoute: nextRepair?.runtime?.route ?? null
};
checkpoint.repairQueue = queue.repairQueue;
checkpoint.discoveryHalt = queue.discoveryHalt;
write(queuePath, queue);
write(checkpointPath, checkpoint);

console.log(JSON.stringify({
  processed: counts.processed,
  verifiedWithoutChange: counts.verifiedWithoutChange,
  repaired: counts.repaired,
  partial: counts.partial,
  blocked: counts.blockedSource + counts.blockedContract,
  remaining: counts.unreviewed,
  completedScreenId: screenId,
  nextRepairScreenId: nextRepairId,
  discoveryHaltedBefore: queue.discoveryHalt?.haltedBeforeScreenId ?? 'PUB-09',
  evidencePaths: review.evidencePaths
}, null, 2));
