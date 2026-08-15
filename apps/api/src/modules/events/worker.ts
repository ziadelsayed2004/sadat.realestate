import {
  outboxFailureSchema,
  outboxLeaseSchema,
  outboxWorkerIdSchema,
  type OutboxEventDomain
} from '@sadat-realestate/contracts';
import type { OutboxEventRecord, OutboxRepository } from './repository.js';

export const OUTBOX_DEFAULT_LEASE_MS = 30_000;
export const OUTBOX_DEFAULT_BATCH_SIZE = 20;
export const OUTBOX_DEFAULT_RETRY_BASE_MS = 1_000;
export const OUTBOX_DEFAULT_RETRY_MAX_MS = 60 * 60 * 1_000;

export class OutboxJobError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = true) {
    super(message);
    this.name = 'OutboxJobError';
  }
}

export type OutboxEventHandler = (event: OutboxEventRecord) => Promise<void> | void;
export type OutboxHandlerMap = Readonly<Record<string, OutboxEventHandler>>;

export interface OutboxWorkerDependencies {
  repository: OutboxRepository;
  workerId: string;
  handlers: OutboxHandlerMap;
  leaseMs?: number;
  batchSize?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  now?: () => Date;
}

export interface OutboxWorkerRunResult {
  claimed: number;
  delivered: number;
  retried: number;
  deadLettered: number;
  leaseLost: number;
}

export interface OutboxWorker {
  runOnce(): Promise<OutboxWorkerRunResult>;
  start(intervalMs?: number): () => void;
  stop(): void;
}

function handlerKey(event: { domain: OutboxEventDomain; type: string }): string {
  return `${event.domain}:${event.type}`;
}

function resolveHandler(handlers: OutboxHandlerMap, event: OutboxEventRecord): OutboxEventHandler | undefined {
  return handlers[handlerKey(event)] ?? handlers[`${event.domain}:*`] ?? handlers['*'];
}

export function calculateRetryDelayMs(attempt: number, baseMs = OUTBOX_DEFAULT_RETRY_BASE_MS, maxMs = OUTBOX_DEFAULT_RETRY_MAX_MS): number {
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError('attempt must be a positive integer');
  if (!Number.isFinite(baseMs) || baseMs < 1 || !Number.isFinite(maxMs) || maxMs < baseMs) throw new RangeError('invalid retry bounds');
  return Math.min(maxMs, baseMs * (2 ** Math.min(attempt - 1, 30)));
}

function failureFrom(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof OutboxJobError) return { code: error.code, message: error.message, retryable: error.retryable };
  if (error instanceof Error) return { code: 'HANDLER_FAILURE', message: error.message || 'Outbox handler failed', retryable: true };
  return { code: 'HANDLER_FAILURE', message: 'Outbox handler failed', retryable: true };
}

function safeFailure(code: string, message: string, availableAt?: Date) {
  const normalizedCode = code.trim().replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 96) || 'HANDLER_FAILURE';
  const normalizedMessage = message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500) || 'Outbox handler failed';
  const parsed = outboxFailureSchema.parse({ code: normalizedCode, message: normalizedMessage, ...(availableAt ? { availableAt: availableAt.toISOString() } : {}) });
  return parsed;
}

export function createOutboxWorker(dependencies: OutboxWorkerDependencies): OutboxWorker {
  const workerId = outboxWorkerIdSchema.parse(dependencies.workerId);
  const leaseMs = dependencies.leaseMs ?? OUTBOX_DEFAULT_LEASE_MS;
  const batchSize = dependencies.batchSize ?? OUTBOX_DEFAULT_BATCH_SIZE;
  const retryBaseMs = dependencies.retryBaseMs ?? OUTBOX_DEFAULT_RETRY_BASE_MS;
  const retryMaxMs = dependencies.retryMaxMs ?? OUTBOX_DEFAULT_RETRY_MAX_MS;
  outboxLeaseSchema.parse({ workerId, leaseMs, limit: batchSize });
  const now = dependencies.now ?? (() => new Date());
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const runOnce = async (): Promise<OutboxWorkerRunResult> => {
    const stamp = now();
    const events = await dependencies.repository.claimAvailable({ workerId, leaseMs, limit: batchSize }, stamp);
    const result: OutboxWorkerRunResult = { claimed: events.length, delivered: 0, retried: 0, deadLettered: 0, leaseLost: 0 };
    for (const event of events) {
      const handler = resolveHandler(dependencies.handlers, event);
      if (!handler) {
        const outcome = await dependencies.repository.deadLetter(event.id, workerId, safeFailure('HANDLER_MISSING', `No handler registered for ${handlerKey(event)}`), now());
        if (outcome === 'dead_lettered') result.deadLettered += 1;
        else result.leaseLost += 1;
        continue;
      }
      try {
        await handler(event);
        if (await dependencies.repository.markDelivered(event.id, workerId, now())) result.delivered += 1;
        else result.leaseLost += 1;
      } catch (error) {
        const failure = failureFrom(error);
        const current = now();
        const retryAt = new Date(current.getTime() + calculateRetryDelayMs(event.attempts, retryBaseMs, retryMaxMs));
        const failureInput = safeFailure(failure.code, failure.message, retryAt);
        const outcome = failure.retryable
          ? await dependencies.repository.retry(event.id, workerId, failureInput, current)
          : await dependencies.repository.deadLetter(event.id, workerId, failureInput, current);
        if (outcome === 'retry_scheduled') result.retried += 1;
        else if (outcome === 'dead_lettered') result.deadLettered += 1;
        else result.leaseLost += 1;
      }
    }
    return result;
  };

  const loop = async (intervalMs: number): Promise<void> => {
    if (!running) return;
    try {
      await runOnce();
    } finally {
      if (running) timer = setTimeout(() => { void loop(intervalMs); }, intervalMs);
    }
  };

  return {
    runOnce,
    start(intervalMs = 1_000) {
      if (!Number.isSafeInteger(intervalMs) || intervalMs < 10 || intervalMs > 60 * 60 * 1_000) throw new RangeError('invalid worker interval');
      if (running) return () => { this.stop(); };
      running = true;
      timer = setTimeout(() => { void loop(intervalMs); }, 0);
      return () => { running = false; if (timer) clearTimeout(timer); timer = undefined; };
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = undefined;
    }
  };
}

export const outboxHandlerKey = handlerKey;
export type OutboxSupportedDomain = OutboxEventDomain;
