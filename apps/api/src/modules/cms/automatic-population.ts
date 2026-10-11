import type { Connection } from 'mongoose';

export const POPULATION_SOURCE_URL = 'https://worldpopulationreview.com/cities/egypt/sadat-city';
const DAY = 24 * 60 * 60 * 1000;
const RETRY_DELAY = 60 * 60 * 1000;
const MAX_HTML_BYTES = 2_000_000;
export interface PopulationSnapshot { value: number; year: number; checkedAt: string }
export interface PopulationSnapshotStore {
  read(): Promise<PopulationSnapshot | null>;
  save(snapshot: PopulationSnapshot): Promise<void>;
}

// Read only the full Sadat City sentence, never the rounded card or another city's table.
export function parsePopulationSource(html: string, now = new Date()): { value: number; year: number } {
  const text = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[^]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&(?:apos|#39|#x27);/gi, "'").replace(/&(?:nbsp|#160);/gi, ' ').replace(/\s+/g, ' ');
  const matches = [...text.matchAll(/Sadat City['’]s\s+(\d{4})\s+population is now estimated at\s+(\d{1,3}(?:,\d{3})+|\d+)\s*\.(?=\s|$)/g)];
  const readings = matches.map(match => ({ year: Number(match[1]), value: Number(match[2]!.replaceAll(',', '')) }));
  const reading = readings[0];
  if (!reading || readings.some(item => item.value !== reading.value || item.year !== reading.year)
    || !Number.isSafeInteger(reading.value) || reading.value < 1 || reading.value > 100_000_000
    || reading.year < now.getUTCFullYear() - 1 || reading.year > now.getUTCFullYear() + 1) {
    throw new Error('Population source did not contain a valid Sadat City estimate');
  }
  return reading;
}

export async function fetchPopulationSource(fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher(POPULATION_SOURCE_URL, {
    signal: AbortSignal.timeout(5000), redirect: 'error',
    headers: { accept: 'text/html', 'user-agent': 'SadatRealEstate/1.0 (daily city population reference)' }
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || !response.body) {
    throw new Error('Population source is unavailable');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_HTML_BYTES) throw new Error('Population source exceeded the response limit');
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel(); reader.releaseLock(); }
}

export function createAutomaticPopulationReader(dependencies: {
  store: PopulationSnapshotStore; load?: () => Promise<string>; now?: () => Date;
  onError?: (error: unknown) => void;
}) {
  const now = dependencies.now ?? (() => new Date());
  let pending: Promise<PopulationSnapshot | null> | undefined;
  let retryAfter = 0;
  const report = dependencies.onError ?? (() => { console.warn('Population source refresh failed; retaining the last verified estimate.'); });
  async function refresh(previous: PopulationSnapshot | null): Promise<PopulationSnapshot | null> {
    try {
      const at = now();
      const estimate = parsePopulationSource(await (dependencies.load ?? fetchPopulationSource)(), at);
      if (previous && estimate.year < previous.year) throw new Error('Population source year regressed');
      const snapshot = { ...estimate, checkedAt: at.toISOString() };
      await dependencies.store.save(snapshot);
      const saved = await dependencies.store.read();
      retryAfter = 0;
      return saved ?? snapshot;
    } catch (error) {
      retryAfter = now().getTime() + RETRY_DELAY;
      report(error);
      return previous;
    }
  }
  return async (): Promise<PopulationSnapshot | null> => {
    const previous = await dependencies.store.read();
    const at = now().getTime();
    if (previous && at - Date.parse(previous.checkedAt) < DAY) return previous;
    if (at < retryAfter) return previous;
    pending ??= refresh(previous).finally(() => { pending = undefined; });
    // Cached pages never wait on the remote website. The first read waits at most five seconds.
    return previous ?? await pending;
  };
}

export type AutomaticPopulationReader = ReturnType<typeof createAutomaticPopulationReader>;
const readers = new WeakMap<Connection, AutomaticPopulationReader>();
export function mongooseAutomaticPopulationReader(connection: Connection): AutomaticPopulationReader {
  const existing = readers.get(connection);
  if (existing) return existing;
  const collection = connection.collection<PopulationSnapshot & { _id: string }>('cms_population_source_cache');
  const reader = createAutomaticPopulationReader({ store: {
    async read() {
      const row = await collection.findOne({ _id: 'world_population_review_sadat_city' });
      if (!row || !Number.isSafeInteger(row.value) || row.value < 1 || row.value > 100_000_000
        || !Number.isInteger(row.year) || row.year < 1900 || row.year > 2200 || !Number.isFinite(Date.parse(row.checkedAt))) return null;
      return { value: row.value, year: row.year, checkedAt: row.checkedAt };
    },
    async save(snapshot) {
      try {
        await collection.updateOne({ _id: 'world_population_review_sadat_city', $or: [
          { year: { $exists: false } }, { year: { $lt: snapshot.year } },
          { year: snapshot.year, checkedAt: { $lte: snapshot.checkedAt } }
        ] }, { $set: snapshot }, { upsert: true });
      } catch (error) {
        // A different process already saved a more recent check. Keep its verified snapshot.
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
      }
    }
  } });
  readers.set(connection, reader);
  return reader;
}

export function populationStatement(snapshot: PopulationSnapshot | null) {
  return snapshot ? { status: 'available' as const, value: snapshot.value,
    sourceLabel: { ar: 'World Population Review', en: 'World Population Review' }, sourceUrl: POPULATION_SOURCE_URL,
    asOf: `${snapshot.year}-01-01T00:00:00.000Z`, sourceYear: snapshot.year, checkedAt: snapshot.checkedAt
  } : { status: 'unavailable' as const };
}
