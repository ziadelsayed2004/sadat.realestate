import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const canonicalFigmaFileKey = 'Odl1Epn2u6lIEuIMmABT7o';
const forbiddenFigmaFileKey = '0HBdTNGROmmpC6S7OYa3iJ';
const generatedAt = new Date().toISOString();

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const inventory = readJson('docs/quality/figma_parity/FIGMA_SCREEN_INVENTORY.json');
const coverage = readJson('agent_pack/01_product/SCREEN_COVERAGE.json');
const coverageById = new Map(coverage.map((row) => [row.id, row]));

if (inventory.canonicalFigmaFileKey !== canonicalFigmaFileKey) {
  throw new Error(`Inventory is not canonical: ${inventory.canonicalFigmaFileKey}`);
}
if (JSON.stringify(inventory).includes(forbiddenFigmaFileKey)) {
  throw new Error('Forbidden Figma file key found in inventory');
}

const surfaceOrder = [
  { key: 'public', label: 'Public Website' },
  { key: 'auth', label: 'Authentication and Onboarding' },
  { key: 'seeker', label: 'Seeker Dashboard' },
  { key: 'provider', label: 'Provider Dashboard' },
  { key: 'admin', label: 'Admin Dashboard' },
];
const surfaceRank = new Map(surfaceOrder.map((surface, index) => [surface.key, index]));

const screens = [...inventory.screens]
  .sort((left, right) => {
    const rankDifference = (surfaceRank.get(left.surface) ?? 99) - (surfaceRank.get(right.surface) ?? 99);
    return rankDifference || left.screenId.localeCompare(right.screenId, undefined, { numeric: true });
  })
  .map((source, index) => {
    const row = coverageById.get(source.screenId);
    const exactNodeIds = source.exactCloneNodeIds ?? (source.exactCloneNodeId ? [source.exactCloneNodeId] : []);
    const responsive = source.surface === 'public' || source.surface === 'auth';
    return {
      sequence: index + 1,
      screenId: source.screenId,
      surface: source.surface,
      surfaceLabel: source.surfaceLabel,
      englishName: source.englishName,
      sourceAuthority: source.sourceAuthority,
      clone: {
        fileKey: canonicalFigmaFileKey,
        pageId: source.clonePageId,
        nodeId: source.exactCloneNodeId ?? null,
        nodeIds: exactNodeIds,
        url: source.exactCloneUrl,
        pageUrl: `https://www.figma.com/proto/${canonicalFigmaFileKey}/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?page-id=${encodeURIComponent(source.clonePageId)}`,
      },
      runtime: {
        route: source.runtimeRoute ?? row?.route ?? null,
        role: source.requiredRole ?? null,
        permissions: {
          requiredRole: source.requiredRole ?? null,
          availableActions: null,
          ownership: null,
          source: 'pending direct runtime contract capture',
        },
        locales: source.localeScopes ?? row?.locales ?? [],
        directions: source.directionScope ?? row?.directionScope ?? [],
        devices: source.deviceScope ?? row?.deviceScope ?? [],
      },
      deterministicState: {
        seed: null,
        apiFixtures: [],
        authSession: null,
        state: source.supportedStates ?? [],
        status: 'PENDING_CAPTURE',
      },
      responsiveCoverage: responsive ? {
        includedInThisCanonicalScreen: true,
        finalSurfacePass: 'responsive_public_auth',
        devices: source.deviceScope ?? [],
      } : null,
      evidenceDir: `docs/quality/figma_parity/screens/${source.screenId}`,
      evidence: {
        figmaContext: null,
        figmaScreenshot: null,
        runtimeBefore: null,
        structuredVisualComparison: null,
        functionalApiComparison: null,
        defects: [],
        repairedFiles: [],
        runtimeAfter: null,
        reviewedDiff: null,
        focusedTests: [],
        accessibility: null,
      },
      classification: 'PENDING',
      processedAt: null,
      notes: [],
    };
  });

const responsiveScreenIds = screens
  .filter((screen) => screen.responsiveCoverage)
  .map((screen) => screen.screenId);

const queue = {
  schemaVersion: 1,
  generatedAt,
  updatedAt: generatedAt,
  executionMode: 'fresh_screen_by_screen_clone_figma_audit',
  canonicalFigmaFileKey,
  forbiddenFigmaFileKey,
  canonicalScreenCount: screens.length,
  requiredClassifications: [
    'VERIFIED_NO_CHANGE',
    'REPAIRED',
    'PARTIAL',
    'BLOCKED_SOURCE',
    'BLOCKED_CONTRACT',
  ],
  processingRules: {
    oneScreenAtATime: true,
    continueAutomaticallyAfterClose: true,
    oldSnapshotsAreNotProof: true,
    fullMatrixAllowedOnlyWhen: 'verifiedScreens + repairedScreens = 131; partialScreens = 0; blockedScreens = 0; unreviewedScreens = 0',
  },
  surfaceOrder: [
    ...surfaceOrder,
    {
      key: 'responsive_public_auth',
      label: 'Responsive Public/Auth screens',
      canonicalScreenIds: responsiveScreenIds,
      note: 'Responsive coverage is a review scope on the same canonical Public/Auth screen IDs; no duplicate queue entries are created.',
    },
  ],
  cursor: {
    nextSequence: 1,
    currentScreenId: screens[0]?.screenId ?? null,
    currentFigmaNode: screens[0]?.clone?.nodeId ?? null,
    currentRuntimeRoute: screens[0]?.runtime?.route ?? null,
  },
  counts: {
    processed: 0,
    pending: screens.length,
    verifiedWithoutChange: 0,
    repaired: 0,
    partial: 0,
    blockedSource: 0,
    blockedContract: 0,
    unreviewed: screens.length,
  },
  screens,
};

const outputPath = path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json');
fs.writeFileSync(outputPath, JSON.stringify(queue, null, 2) + '\n');
console.log(JSON.stringify({ outputPath, canonicalScreenCount: screens.length, responsiveCoverageScreens: responsiveScreenIds.length }, null, 2));
