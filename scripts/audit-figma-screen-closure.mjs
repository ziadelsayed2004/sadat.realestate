import { access, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const inventoryPath = path.join(root, 'docs/design_sources/figma/SCREEN_FRAME_INVENTORY.json');
const queuePath = path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json');
const outputPath = path.join(root, 'docs/quality/figma_parity/CURRENT_COMPLETION_AUDIT.json');
const requiredSurfaces = new Set(['auth', 'seeker', 'provider', 'admin']);
const closedClassifications = new Set(['REPAIRED_VERIFIED', 'VERIFIED_NO_CHANGE']);

const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const exists = async file => {
  try {
    await access(file, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const [inventory, queue] = await Promise.all([readJson(inventoryPath), readJson(queuePath)]);
const queuedById = new Map(queue.screens.map(screen => [screen.screenId, screen]));
const rows = [];

for (const screen of inventory.screens.filter(item => requiredSurfaces.has(item.surface))) {
  const id = screen.canonicalScreenId;
  const queued = queuedById.get(id);
  const sourcePath = path.join(root, `docs/design_sources/final_screens/${screen.surface === 'auth' ? 'authentication' : screen.surface}/${id}.png`);
  const evidenceDirectory = path.join(root, `docs/quality/figma_parity/screens/${id}`);
  const reviewPath = path.join(evidenceDirectory, 'review.json');
  const review = await exists(reviewPath) ? await readJson(reviewPath) : undefined;
  const queuedFigmaPath = queued?.evidence?.figmaScreenshot?.path;
  const sourcePresent = await exists(sourcePath)
    || (typeof queuedFigmaPath === 'string' && await exists(path.join(root, queuedFigmaPath)));
  const evidencePresent = await exists(evidenceDirectory);
  const queuedReviewPath = queued?.evidence?.coordinatorReconciliation?.latestEvidence?.reviewPath;
  const reviewPresent = review !== undefined
    || (typeof queuedReviewPath === 'string' && await exists(path.join(root, queuedReviewPath)))
    || queued?.evidence?.reviewedDiff?.reviewed === true;
  const classification = queued?.classification ?? 'MISSING_QUEUE_ENTRY';
  const owningFramePresent = typeof screen.figmaFrameNodeId === 'string' && screen.figmaFrameNodeId.length > 0;
  const routePresent = typeof (queued?.runtime?.route ?? screen.route) === 'string';
  const blockers = [];

  if (!sourcePresent) blockers.push('LOCAL_SOURCE_MISSING');
  if (!owningFramePresent) blockers.push('FIGMA_OWNING_FRAME_MISSING');
  if (!routePresent) blockers.push('RUNTIME_ROUTE_MISSING');
  if (!evidencePresent || !reviewPresent) blockers.push('REVIEW_EVIDENCE_MISSING');
  if (!closedClassifications.has(classification)) blockers.push(classification);

  rows.push({
    screenId: id,
    surface: screen.surface,
    name: screen.englishName,
    route: queued?.runtime?.route ?? screen.route ?? null,
    figmaPageId: screen.figmaPageId,
    figmaFrameNodeId: screen.figmaFrameNodeId,
    sourcePresent,
    reviewPresent,
    classification,
    closureProven: blockers.length === 0,
    blockers
  });
}

const bySurface = Object.fromEntries([...requiredSurfaces].map(surface => {
  const surfaceRows = rows.filter(row => row.surface === surface);
  return [surface, {
    total: surfaceRows.length,
    closed: surfaceRows.filter(row => row.closureProven).length,
    open: surfaceRows.filter(row => !row.closureProven).length
  }];
}));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  authority: {
    figmaFileKey: inventory.authority.figmaFileKey,
    inventory: path.relative(root, inventoryPath).replaceAll('\\', '/'),
    executionQueue: path.relative(root, queuePath).replaceAll('\\', '/')
  },
  summary: {
    total: rows.length,
    closed: rows.filter(row => row.closureProven).length,
    open: rows.filter(row => !row.closureProven).length,
    bySurface
  },
  screens: rows
};

if (process.argv.includes('--write')) {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
if (process.argv.includes('--strict') && report.summary.open > 0) process.exitCode = 1;
