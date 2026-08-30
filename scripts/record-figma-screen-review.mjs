import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--') ? [[value.slice(2), values[index + 1] ?? true]] : []));
const screenId = String(args.get('screen-id') ?? '');
const queuePath = path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json');
const checkpointPath = path.join(root, 'docs/quality/figma_parity/RUN_CHECKPOINT.json');
if (!screenId) throw new Error('Missing --screen-id');

const read = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const write = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
const queue = read(queuePath);
const reviewPath = path.join(root, 'docs/quality/figma_parity/screens', screenId, 'review.json');
const review = read(reviewPath);
const entry = queue.screens.find((screen) => screen.screenId === screenId);
if (!entry) throw new Error(`Unknown queue screen: ${screenId}`);
const allowed = new Set(queue.requiredClassifications);
if (review.screenId !== screenId) throw new Error(`Review screen mismatch: ${review.screenId}`);
if (!allowed.has(review.classification)) throw new Error(`Unsupported classification: ${review.classification}`);
if (review.classification === 'PARTIAL') throw new Error('PARTIAL is evidence only and cannot be recorded as processed; use the bounded repair queue.');
if (review.source?.fileKey !== queue.canonicalFigmaFileKey) throw new Error('Review is not tied to the canonical Figma file');
const sourceIsException = entry?.sourceAuthority !== 'CANONICAL_CLONE_FRAME';
if (!sourceIsException && (review.source?.nodeId === null || review.source?.nodeId === undefined)) {
  throw new Error('Review is missing exact clone node');
}
if (review.classification === 'BLOCKED_SOURCE' && sourceIsException !== true) {
  throw new Error('BLOCKED_SOURCE is only valid for an explicitly non-canonical source entry');
}
for (const relativePath of ['figma.png', 'runtime-before.png', 'runtime-after.png', 'diff.png', 'review.json']) {
  const absolutePath = path.join(root, 'docs/quality/figma_parity/screens', screenId, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing required evidence: ${absolutePath}`);
}

entry.classification = review.classification;
entry.processedAt = new Date().toISOString();
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
  reviewedDiff: { path: review.structuredVisualComparison.diffPath, reviewed: review.structuredVisualComparison.reviewed },
  focusedTests: review.focusedTests,
  accessibility: review.accessibility,
};
entry.notes = [review.classificationReason];

const classificationByQueueStatus = {
  VERIFIED_NO_CHANGE: 'verifiedWithoutChange',
  REPAIRED: 'repaired',
  REPAIRED_VERIFIED: 'repaired',
  PARTIAL: 'partial',
  PARTIAL_EXTERNAL: 'partial',
  BLOCKED_SOURCE: 'blockedSource',
  BLOCKED_CONTRACT: 'blockedContract',
};
const counts = {
  processed: queue.screens.filter((screen) => screen.classification !== 'PENDING').length,
  pending: queue.screens.filter((screen) => screen.classification === 'PENDING').length,
  verifiedWithoutChange: 0,
  repaired: 0,
  partial: 0,
  blockedSource: 0,
  blockedContract: 0,
  unreviewed: 0,
};
for (const screen of queue.screens) {
  if (screen.classification === 'PENDING') counts.unreviewed += 1;
  else {
    const countKey = classificationByQueueStatus[screen.classification];
    if (countKey === undefined) throw new Error(`Unsupported recorded classification: ${screen.classification}`);
    counts[countKey] += 1;
  }
}
queue.counts = counts;
queue.updatedAt = new Date().toISOString();
const next = queue.screens.find((screen) => screen.classification === 'PENDING');
queue.cursor = {
  nextSequence: next?.sequence ?? null,
  currentScreenId: next?.screenId ?? null,
  currentFigmaNode: next?.clone?.nodeId ?? null,
  currentRuntimeRoute: next?.runtime?.route ?? null,
};
write(queuePath, queue);

const checkpoint = read(checkpointPath);
checkpoint.updatedAt = queue.updatedAt;
checkpoint.screenExecutionQueue = {
  path: 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json',
  processed: counts.processed,
  verifiedWithoutChange: counts.verifiedWithoutChange,
  repaired: counts.repaired,
  partial: counts.partial,
  blocked: counts.blockedSource + counts.blockedContract,
  unreviewed: counts.unreviewed,
  nextScreenId: next?.screenId ?? null,
  nextCloneNode: next?.clone?.nodeId ?? null,
  nextRuntimeRoute: next?.runtime?.route ?? null,
};
checkpoint.status = 'fresh_screen_audit_in_progress';
write(checkpointPath, checkpoint);

console.log(JSON.stringify({
  processed: counts.processed,
  verifiedWithoutChange: counts.verifiedWithoutChange,
  repaired: counts.repaired,
  partial: counts.partial,
  blocked: counts.blockedSource + counts.blockedContract,
  remaining: counts.unreviewed,
  currentScreenId: next?.screenId ?? null,
  currentFigmaNode: next?.clone?.nodeId ?? null,
  currentRuntimeRoute: next?.runtime?.route ?? null,
  completedScreenId: screenId,
  evidencePaths: `docs/quality/figma_parity/screens/${screenId}/`,
}, null, 2));
