import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queuePath = path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json');
const checkpointPath = path.join(root, 'docs/quality/figma_parity/RUN_CHECKPOINT.json');
const repairScreenIds = ['PUB-01', 'PUB-02', 'PUB-03', 'PUB-04', 'PUB-05', 'PUB-06', 'PUB-07', 'PUB-08'];
const canonicalFigmaFileKey = 'Odl1Epn2u6lIEuIMmABT7o';

const read = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const write = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
const queue = read(queuePath);
if (queue.canonicalFigmaFileKey !== canonicalFigmaFileKey) throw new Error('Queue is not tied to the canonical Figma file');

const repairEntries = repairScreenIds.map((screenId, index) => {
  const entry = queue.screens.find(screen => screen.screenId === screenId);
  if (!entry) throw new Error(`Missing repair screen ${screenId}`);
  if (entry.classification !== 'PARTIAL') throw new Error(`${screenId} must remain PARTIAL until repaired`);
  if (entry.processedAt !== null) {
    entry.reviewedAt = entry.processedAt;
    entry.processedAt = null;
  }
  entry.processingState = 'REPAIR_REQUIRED';
  entry.repairStatus = 'PENDING';
  entry.repairSequence = index + 1;
  entry.notes = [...new Set([
    ...entry.notes,
    'Partial review is evidence only and is not counted as processed.',
    'Queued for bounded shared public-foundation repair before any new screen discovery.'
  ])];
  return {
    sequence: index + 1,
    screenId,
    status: 'PENDING',
    classification: 'PARTIAL',
    evidenceDir: entry.evidenceDir,
    cloneNode: entry.clone.nodeId,
    runtimeRoute: entry.runtime.route
  };
});

const classificationCounts = {
  verifiedWithoutChange: queue.screens.filter(screen => screen.classification === 'VERIFIED_NO_CHANGE').length,
  repaired: queue.screens.filter(screen => screen.classification === 'REPAIRED').length,
  partial: queue.screens.filter(screen => screen.classification === 'PARTIAL').length,
  blockedSource: queue.screens.filter(screen => screen.classification === 'BLOCKED_SOURCE').length,
  blockedContract: queue.screens.filter(screen => screen.classification === 'BLOCKED_CONTRACT').length,
  unreviewed: queue.screens.filter(screen => screen.classification === 'PENDING').length,
};
const nextRepair = repairEntries.find(entry => entry.status === 'PENDING');
const discoveryStop = queue.screens.find(screen => screen.screenId === 'PUB-09');
const now = new Date().toISOString();

queue.schemaVersion = Math.max(queue.schemaVersion ?? 1, 2);
queue.updatedAt = now;
queue.executionMode = 'bounded_public_shared_foundation_repair_before_new_screen_discovery';
queue.processingRules = {
  ...queue.processingRules,
  partialIsNotProcessed: true,
  runtimeAfterRequiresActualRepair: true,
  discoveryHaltedUntilRepairQueueClosed: true
};
queue.discoveryHalt = {
  halted: true,
  haltedBeforeScreenId: discoveryStop?.screenId ?? 'PUB-09',
  haltedBeforeCloneNode: discoveryStop?.clone?.nodeId ?? '6017:11634',
  haltedBeforeRuntimeRoute: discoveryStop?.runtime?.route ?? '/community',
  reason: 'Do not discover new screens until PUB-01 through PUB-08 have zero repository-owned material defects.'
};
queue.repairQueue = {
  mode: 'bounded_public_shared_foundation',
  scope: 'public header/navigation, hero/search, approved imagery/media, card grids, filters, CTA sections, footer, deterministic API-backed success data',
  screenIds: repairEntries,
  nextScreenId: nextRepair?.screenId ?? null,
  nextSequence: nextRepair?.sequence ?? null,
  status: nextRepair ? 'IN_PROGRESS' : 'CLOSED'
};
queue.cursor = {
  phase: 'repair',
  nextSequence: nextRepair?.sequence ?? null,
  currentScreenId: nextRepair?.screenId ?? null,
  currentFigmaNode: nextRepair ? queue.screens.find(screen => screen.screenId === nextRepair.screenId)?.clone?.nodeId ?? null : null,
  currentRuntimeRoute: nextRepair ? queue.screens.find(screen => screen.screenId === nextRepair.screenId)?.runtime?.route ?? null : null
};
queue.counts = {
  processed: classificationCounts.verifiedWithoutChange + classificationCounts.repaired + classificationCounts.blockedSource + classificationCounts.blockedContract,
  pending: classificationCounts.unreviewed,
  ...classificationCounts
};
write(queuePath, queue);

const checkpoint = read(checkpointPath);
checkpoint.updatedAt = now;
checkpoint.status = 'public_repair_batch_in_progress';
checkpoint.lastCompletedIndependentWork = [
  ...(checkpoint.lastCompletedIndependentWork ?? []),
  'PUB-01-through-PUB-08-partial-reviews-moved-to-repair-queue',
  'new-screen-discovery-halted-before-PUB-09'
];
checkpoint.remainingIndependentWork = [
  'bounded shared public-foundation repair for PUB-01 through PUB-08',
  'fresh runtime-after capture and focused confirmation for each repaired screen',
  'fresh per-screen clone-Figma evidence for remaining canonical screens after repair queue closes',
  'surface gates and final release-gate evidence after all screen classifications pass'
];
checkpoint.screenExecutionQueue = {
  path: 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json',
  phase: 'repair',
  processed: queue.counts.processed,
  verifiedWithoutChange: queue.counts.verifiedWithoutChange,
  repaired: queue.counts.repaired,
  partial: queue.counts.partial,
  blocked: queue.counts.blockedSource + queue.counts.blockedContract,
  unreviewed: queue.counts.unreviewed,
  nextScreenId: nextRepair?.screenId ?? null,
  nextCloneNode: nextRepair ? queue.screens.find(screen => screen.screenId === nextRepair.screenId)?.clone?.nodeId ?? null : null,
  nextRuntimeRoute: nextRepair ? queue.screens.find(screen => screen.screenId === nextRepair.screenId)?.runtime?.route ?? null : null
};
checkpoint.repairQueue = queue.repairQueue;
checkpoint.discoveryHalt = queue.discoveryHalt;
write(checkpointPath, checkpoint);

console.log(JSON.stringify({
  repairScreenIds,
  processed: queue.counts.processed,
  partial: queue.counts.partial,
  unreviewed: queue.counts.unreviewed,
  nextRepairScreenId: nextRepair?.screenId ?? null,
  discoveryHaltedBefore: queue.discoveryHalt.haltedBeforeScreenId
}, null, 2));
