import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queuePath = path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json');
const checkpointPath = path.join(root, 'docs/quality/figma_parity/RUN_CHECKPOINT.json');
const screenIds = ['PUB-01', 'PUB-02', 'PUB-03', 'PUB-04', 'PUB-05', 'PUB-06', 'PUB-07', 'PUB-08'];
const canonicalFigmaFileKey = 'Odl1Epn2u6lIEuIMmABT7o';
const read = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const write = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');

const queue = read(queuePath);
if (queue.canonicalFigmaFileKey !== canonicalFigmaFileKey) throw new Error('Queue is not tied to the canonical Figma file');
const now = new Date().toISOString();

const repairEntries = screenIds.map((screenId, index) => {
  const entry = queue.screens.find(screen => screen.screenId === screenId);
  if (!entry) throw new Error(`Missing closure screen ${screenId}`);
  entry.classification = 'PARTIAL';
  entry.processingState = 'REPAIR_REQUIRED';
  entry.repairStatus = 'PENDING';
  entry.processedAt = null;
  entry.repairSequence = index + 1;
  entry.reviewedAt = entry.reviewedAt ?? now;
  entry.notes = [...new Set([
    ...(entry.notes ?? []),
    'The prior functional repair pass is not visual closure evidence.',
    'Typography, spacing, geometry, and reviewed diff differences remain repository-owned defects.',
    'Queued for the frontend_099 exact Figma parity closure pass; this Partial record is not processed.'
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

const counts = {
  verifiedWithoutChange: queue.screens.filter(screen => screen.classification === 'VERIFIED_NO_CHANGE').length,
  repaired: queue.screens.filter(screen => screen.classification === 'REPAIRED' || screen.classification === 'REPAIRED_VERIFIED').length,
  partial: queue.screens.filter(screen => screen.classification === 'PARTIAL').length,
  blockedSource: queue.screens.filter(screen => screen.classification === 'BLOCKED_SOURCE').length,
  blockedContract: queue.screens.filter(screen => screen.classification === 'BLOCKED_CONTRACT').length,
  unreviewed: queue.screens.filter(screen => screen.classification === 'PENDING').length
};
const nextRepair = repairEntries[0];
const discoveryStop = queue.screens.find(screen => screen.screenId === 'PUB-09');

queue.schemaVersion = Math.max(queue.schemaVersion ?? 1, 2);
queue.updatedAt = now;
queue.executionMode = 'public_exact_figma_parity_closure_before_new_screen_discovery';
queue.processingRules = {
  ...queue.processingRules,
  partialIsNotProcessed: true,
  runtimeAfterRequiresActualRepair: true,
  closureRequiresNormalVisualSnapshots: true,
  closureRequiresElementLevelDefectList: true,
  allowedFinalClassifications: ['REPAIRED_VERIFIED', 'VERIFIED_NO_CHANGE', 'PARTIAL'],
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
  taskId: 'frontend_099',
  mode: 'public_exact_figma_parity_closure',
  pass: 2,
  scope: 'exact typography, geometry, spacing, grids, approved media, controls, CTA/footer, API projections, locale/direction, accessibility, and lazy-loading capture behavior',
  screenIds: repairEntries,
  nextScreenId: nextRepair.screenId,
  nextSequence: nextRepair.sequence,
  status: 'IN_PROGRESS'
};
queue.cursor = {
  phase: 'repair',
  taskId: 'frontend_099',
  nextSequence: nextRepair.sequence,
  currentScreenId: nextRepair.screenId,
  currentFigmaNode: queue.screens.find(screen => screen.screenId === nextRepair.screenId).clone.nodeId,
  currentRuntimeRoute: queue.screens.find(screen => screen.screenId === nextRepair.screenId).runtime.route
};
queue.counts = {
  processed: counts.verifiedWithoutChange + counts.repaired + counts.blockedSource + counts.blockedContract,
  pending: counts.unreviewed + counts.partial,
  ...counts
};
write(queuePath, queue);

const checkpoint = read(checkpointPath);
checkpoint.updatedAt = now;
checkpoint.currentTask = 'frontend_099';
checkpoint.status = 'public_exact_figma_parity_closure_in_progress';
checkpoint.lastCompletedIndependentWork = [
  ...(checkpoint.lastCompletedIndependentWork ?? []).filter(item => item !== 'PUB-01-through-PUB-08-repair-batch-completed-with-discovery-halted-before-PUB-09'),
  'PUB-01-through-PUB-08-prior-functional-pass-retained-as-nonfinal-evidence',
  'frontend_099-exact-parity-closure-task-created',
  'PUB-01-through-PUB-08-reopened-for-second-implementation-pass',
  'new-screen-discovery-remains-halted-before-PUB-09'
];
checkpoint.remainingIndependentWork = [
  'exact visual closure for PUB-01 through PUB-08 in order',
  'new runtime-after and reviewed diff evidence for each repaired screen',
  'normal visual, functional, accessibility, locale/direction, and performance focused gates',
  'surface gates after closure; do not discover PUB-09 before the closure task passes'
];
checkpoint.screenExecutionQueue = {
  path: 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json',
  phase: 'repair',
  processed: queue.counts.processed,
  verifiedWithoutChange: counts.verifiedWithoutChange,
  repaired: counts.repaired,
  partial: counts.partial,
  blocked: counts.blockedSource + counts.blockedContract,
  unreviewed: counts.unreviewed,
  nextScreenId: nextRepair.screenId,
  nextCloneNode: nextRepair.cloneNode,
  nextRuntimeRoute: nextRepair.runtimeRoute
};
checkpoint.repairQueue = queue.repairQueue;
checkpoint.discoveryHalt = queue.discoveryHalt;
write(checkpointPath, checkpoint);

console.log(JSON.stringify({ taskId: 'frontend_099', processed: queue.counts.processed, partial: counts.partial, nextRepairScreenId: nextRepair.screenId, discoveryHaltedBefore: queue.discoveryHalt.haltedBeforeScreenId }, null, 2));
