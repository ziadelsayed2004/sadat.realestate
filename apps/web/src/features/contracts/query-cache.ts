import { ApiClientError } from './api-client.ts';

export interface QueryCacheConfiguration {
  maxEntries?: number;
  now?: () => number;
}

export interface QueryOptions {
  staleTimeMs?: number;
  signal?: AbortSignal;
}

export type QueryLoader<T> = () => Promise<T>;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface InFlightEntry<T> {
  generation: number;
  promise: Promise<T>;
}

function assertKey(key: string): void {
  if (!key.trim()) throw new TypeError('A query cache key is required');
}

function staleTime(options: QueryOptions): number {
  const value = options.staleTimeMs ?? 0;
  if (!Number.isFinite(value) || value < 0) throw new TypeError('Query stale time must be a non-negative number');
  return value;
}

function queryAbortedError(signal?: AbortSignal): ApiClientError {
  const cause = signal?.reason;
  return cause === undefined
    ? new ApiClientError('The query was cancelled.', { code: 'ABORTED' })
    : new ApiClientError('The query was cancelled.', { code: 'ABORTED', cause });
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(queryAbortedError(signal));

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(queryAbortedError(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
    );
  });
}

export class QueryCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, InFlightEntry<unknown>>();
  private readonly generations = new Map<string, number>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(configuration: QueryCacheConfiguration = {}) {
    this.maxEntries = configuration.maxEntries ?? 100;
    if (!Number.isSafeInteger(this.maxEntries) || this.maxEntries < 1) {
      throw new TypeError('Query cache max entries must be a positive integer');
    }
    this.now = configuration.now ?? Date.now;
  }

  get<T>(key: string): T | undefined {
    assertKey(key);
    const entry = this.entries.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async getOrFetch<T>(key: string, loader: QueryLoader<T>, options: QueryOptions = {}): Promise<T> {
    assertKey(key);
    if (typeof loader !== 'function') throw new TypeError('A query loader is required');
    const duration = staleTime(options);
    const cached = this.get<T>(key);
    if (cached !== undefined) return withAbort(Promise.resolve(cached), options.signal);

    const current = this.inFlight.get(key) as InFlightEntry<T> | undefined;
    if (current) return withAbort(current.promise, options.signal);

    const generation = this.generations.get(key) ?? 0;
    const promise = Promise.resolve().then(loader);
    const entry: InFlightEntry<T> = { generation, promise };
    this.inFlight.set(key, entry as InFlightEntry<unknown>);
    void promise.then(
      (value) => {
        if (this.inFlight.get(key)?.promise === promise) this.inFlight.delete(key);
        if ((this.generations.get(key) ?? 0) !== generation) return;
        this.store(key, value, this.now() + duration);
      },
      () => {
        if (this.inFlight.get(key)?.promise === promise) this.inFlight.delete(key);
      }
    );
    return withAbort(promise, options.signal);
  }

  invalidate(key: string): void {
    assertKey(key);
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    this.entries.delete(key);
    this.inFlight.delete(key);
  }

  clear(): void {
    for (const key of this.entries.keys()) this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    for (const key of this.inFlight.keys()) this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    this.entries.clear();
    this.inFlight.clear();
  }

  private store<T>(key: string, value: T, expiresAt: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return;
      this.entries.delete(oldest);
    }
  }
}
