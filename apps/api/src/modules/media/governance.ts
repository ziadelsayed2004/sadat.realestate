import path from 'node:path';
import {
  mediaCleanupCandidateSchema,
  mediaCleanupDecisionSchema,
  mediaStorageKeySchema,
  type MediaAssetNamespace,
  type MediaAssetVisibility,
  type MediaCleanupCandidate,
  type MediaCleanupDecision,
  type MediaRetentionReason
} from '@sadat-real-estate/contracts';

export const MAX_MEDIA_DISPLAY_FILENAME = 120;
const DAY_MS = 24 * 60 * 60 * 1_000;

export const MEDIA_RETENTION_WINDOWS_MS: Readonly<Record<MediaRetentionReason, number>> = Object.freeze({
  unattached_incomplete: DAY_MS,
  infected: DAY_MS,
  abandoned_draft: 90 * DAY_MS,
  superseded: 30 * DAY_MS,
  rejected_withdrawn: 180 * DAY_MS,
  approved_account_closed: 365 * DAY_MS
});

export type MediaGovernanceErrorCode =
  | 'MEDIA_FILENAME_INVALID'
  | 'MEDIA_STORAGE_KEY_INVALID'
  | 'MEDIA_NAMESPACE_MISMATCH'
  | 'MEDIA_RETENTION_DATE_INVALID'
  | 'MEDIA_RETENTION_REASON_REQUIRED';

export class MediaGovernanceError extends Error {
  constructor(readonly code: MediaGovernanceErrorCode) {
    super(code);
    this.name = 'MediaGovernanceError';
  }
}

export function sanitizeMediaFilename(value: string): string {
  if (typeof value !== 'string') throw new MediaGovernanceError('MEDIA_FILENAME_INVALID');
  const withoutControls = value.replace(/[\u0000-\u001f\u007f]/g, '').replaceAll('\\', '/');
  const basename = path.posix.basename(withoutControls).trim();
  if (!basename || basename === '.' || basename === '..') throw new MediaGovernanceError('MEDIA_FILENAME_INVALID');
  const extension = path.extname(basename);
  const maxStemLength = MAX_MEDIA_DISPLAY_FILENAME - extension.length;
  if (maxStemLength < 1) throw new MediaGovernanceError('MEDIA_FILENAME_INVALID');
  return basename.length <= MAX_MEDIA_DISPLAY_FILENAME
    ? basename
    : `${basename.slice(0, maxStemLength)}${extension}`;
}

export function assertMediaPlacement(input: {
  visibility: MediaAssetVisibility;
  namespace: MediaAssetNamespace;
  storageKey: string;
}): void {
  if (!mediaStorageKeySchema.safeParse(input.storageKey).success) {
    throw new MediaGovernanceError('MEDIA_STORAGE_KEY_INVALID');
  }
  const valid = input.visibility === 'public'
    ? input.namespace === 'public'
    : input.namespace === 'private' || input.namespace === 'quarantine';
  if (!valid) throw new MediaGovernanceError('MEDIA_NAMESPACE_MISMATCH');
}

function effectiveReason(candidate: MediaCleanupCandidate): MediaRetentionReason | undefined {
  return candidate.retentionReason ?? (candidate.attached ? undefined : 'unattached_incomplete');
}

export function retentionDeadlineFor(reason: MediaRetentionReason, referenceAt: Date | string): Date {
  const reference = new Date(referenceAt);
  if (Number.isNaN(reference.getTime())) throw new MediaGovernanceError('MEDIA_RETENTION_DATE_INVALID');
  return new Date(reference.getTime() + MEDIA_RETENTION_WINDOWS_MS[reason]);
}

function deadline(candidate: MediaCleanupCandidate, reason: MediaRetentionReason): Date {
  return retentionDeadlineFor(reason, candidate.referenceAt);
}

function decision(
  candidate: MediaCleanupCandidate,
  action: MediaCleanupDecision['action'],
  reason: MediaCleanupDecision['reason'],
  retentionReason: MediaRetentionReason | undefined,
  deleteAfter: Date
): MediaCleanupDecision {
  return mediaCleanupDecisionSchema.parse({
    id: candidate.id,
    action,
    reason,
    ...(retentionReason ? { retentionReason } : {}),
    deleteAfter: deleteAfter.toISOString()
  });
}

export function evaluateMediaCleanup(unparsedCandidate: unknown, now = new Date()): MediaCleanupDecision {
  const candidate = mediaCleanupCandidateSchema.parse(unparsedCandidate);
  assertMediaPlacement(candidate);
  const current = new Date(now);
  if (candidate.lifecycle === 'deleted') return decision(candidate, 'retain', 'already_deleted', candidate.retentionReason, current);
  const reason = effectiveReason(candidate);
  if (!reason) return decision(candidate, 'retain', 'missing_retention_reason', undefined, current);
  const deleteAfter = deadline(candidate, reason);
  if (candidate.legalHold) return decision(candidate, 'retain', 'legal_hold', reason, deleteAfter);
  if (reason === 'unattached_incomplete' && candidate.attached) return decision(candidate, 'retain', 'attached', reason, deleteAfter);
  if (deleteAfter.getTime() > current.getTime()) return decision(candidate, 'retain', 'not_due', reason, deleteAfter);
  return decision(candidate, 'delete', 'eligible', reason, deleteAfter);
}

export function planMediaCleanup(unparsedCandidates: readonly unknown[], now = new Date()): MediaCleanupDecision[] {
  return unparsedCandidates
    .map(candidate => mediaCleanupCandidateSchema.parse(candidate))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'))
    .map(candidate => evaluateMediaCleanup(candidate, now));
}

export interface MediaCleanupExecutor {
  markDeleted(id: string, retentionReason: MediaRetentionReason, occurredAt: Date): Promise<void>;
  deleteObject(storageKey: string): Promise<void>;
}

export interface MediaCleanupResult extends MediaCleanupDecision {
  cleaned: boolean;
}

export async function executeMediaCleanup(
  unparsedCandidates: readonly unknown[],
  executor: MediaCleanupExecutor,
  now = new Date()
): Promise<MediaCleanupResult[]> {
  const parsed = unparsedCandidates.map(candidate => mediaCleanupCandidateSchema.parse(candidate));
  const decisions = planMediaCleanup(parsed, now);
  const byId = new Map(parsed.map(candidate => [candidate.id, candidate]));
  const results: MediaCleanupResult[] = [];
  for (const item of decisions) {
    if (item.action !== 'delete' || !item.retentionReason) {
      results.push({ ...item, cleaned: false });
      continue;
    }
    const candidate = byId.get(item.id);
    if (!candidate) throw new Error('MEDIA_CLEANUP_CANDIDATE_MISSING');
    // Revoke access and persist the tombstone before deleting bytes. A retry is safe.
    await executor.markDeleted(item.id, item.retentionReason, new Date(now));
    await executor.deleteObject(candidate.storageKey);
    results.push({ ...item, cleaned: true });
  }
  return results;
}
