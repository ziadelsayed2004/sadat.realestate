import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiClient,
  ApiClientError,
  buildApiUrl,
  QueryCache
} from '../src/features/contracts/index.ts';
import {
  logoutSuccessEnvelopeSchema,
  publicHomepageSuccessEnvelopeSchema
} from '@sadat-real-estate/contracts';

const logoutResponse = (requestId: string) => ({
  data: { loggedOut: true },
  meta: { requestId }
});

const homepageResponse = (requestId: string) => ({
  data: { sections: [], properties: [], developers: [], content: [], banners: [], categories: [], metrics: [] },
  meta: { requestId }
});

const errorResponse = (requestId: string, code = 'TEMPORARY_UNAVAILABLE') => ({
  error: {
    code,
    messageKey: 'errors.temporaryUnavailable',
    details: [],
    requestId
  }
});

test('API client uses generated envelopes, one /api/v1 prefix, request IDs, JSON, and query encoding', async () => {
  let seenUrl = '';
  let seenInit: RequestInit | undefined;
  const client = new ApiClient({
    requestIdFactory: () => 'web-request-1',
    fetcher: async (input, init) => {
      seenUrl = String(input);
      seenInit = init;
      return new Response(JSON.stringify(logoutResponse('server-request-1')), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  const result = await client.request('/auth/logout', {
    method: 'POST',
    query: { locale: 'ar', include: ['summary', 'actions'] },
    json: { confirm: true },
    responseSchema: logoutSuccessEnvelopeSchema
  });

  assert.equal(seenUrl, '/api/v1/auth/logout?locale=ar&include=summary&include=actions');
  assert.equal(new Headers(seenInit?.headers).get('x-request-id'), 'web-request-1');
  assert.equal(new Headers(seenInit?.headers).get('content-type'), 'application/json');
  assert.equal(seenInit?.credentials, 'include');
  assert.equal(seenInit?.body, JSON.stringify({ confirm: true }));
  assert.deepEqual(result.data, logoutResponse('server-request-1'));
  assert.equal(result.requestId, 'server-request-1');
});

test('API client rejects duplicated API prefixes and invalid response contracts', async () => {
  assert.throws(() => buildApiUrl(undefined, '/api/v1/public/home'), /omit the \/api\/v1 prefix/);

  const client = new ApiClient({
    requestIdFactory: () => 'web-request-2',
    fetcher: async () => new Response(JSON.stringify({ unexpected: true }), { status: 200 })
  });
  await assert.rejects(
    client.request('/public/home', {
      responseSchema: publicHomepageSuccessEnvelopeSchema
    }),
    (error: unknown) => error instanceof ApiClientError && error.code === 'INVALID_RESPONSE'
  );
});

test('API client retries transient safe reads but does not replay a mutation by default', async () => {
  let readAttempts = 0;
  const readClient = new ApiClient({
    requestIdFactory: () => 'web-request-3',
    retry: { maxAttempts: 2, baseDelayMs: 0 },
    fetcher: async () => {
      readAttempts += 1;
      return readAttempts === 1
        ? new Response(JSON.stringify(errorResponse('server-request-3')), { status: 503 })
        : new Response(JSON.stringify(homepageResponse('server-request-3')), { status: 200 });
    }
  });
  const read = await readClient.request('/public/home', { responseSchema: publicHomepageSuccessEnvelopeSchema });
  assert.equal(readAttempts, 2);
  assert.equal(read.requestId, 'server-request-3');

  let mutationAttempts = 0;
  const mutationClient = new ApiClient({
    requestIdFactory: () => 'web-request-4',
    retry: { maxAttempts: 3, baseDelayMs: 0 },
    fetcher: async () => {
      mutationAttempts += 1;
      return new Response(JSON.stringify(errorResponse('server-request-4')), { status: 503 });
    }
  });
  await assert.rejects(
    mutationClient.request('/auth/logout', { method: 'POST', responseSchema: logoutSuccessEnvelopeSchema }),
    (error: unknown) => error instanceof ApiClientError && error.code === 'HTTP_ERROR' && error.status === 503
  );
  assert.equal(mutationAttempts, 1);
});

test('API client cancellation is fail-fast and does not invoke the fetcher', async () => {
  const controller = new AbortController();
  controller.abort('navigation');
  let calls = 0;
  const client = new ApiClient({
    fetcher: async () => {
      calls += 1;
      return new Response(JSON.stringify(logoutResponse('never')), { status: 200 });
    }
  });

  await assert.rejects(
    client.request('/auth/logout', { method: 'POST', signal: controller.signal, responseSchema: logoutSuccessEnvelopeSchema }),
    (error: unknown) => error instanceof ApiClientError && error.code === 'ABORTED'
  );
  assert.equal(calls, 0);
});

test('query cache deduplicates reads, caches successful values, and does not cache failures', async () => {
  let calls = 0;
  const cache = new QueryCache({ maxEntries: 2 });
  const loader = async () => {
    calls += 1;
    return { value: calls };
  };

  const [first, second] = await Promise.all([
    cache.getOrFetch('homepage:ar', loader, { staleTimeMs: 60_000 }),
    cache.getOrFetch('homepage:ar', loader, { staleTimeMs: 60_000 })
  ]);
  assert.deepEqual(first, { value: 1 });
  assert.deepEqual(second, { value: 1 });
  assert.equal(calls, 1);
  assert.deepEqual(await cache.getOrFetch('homepage:ar', loader, { staleTimeMs: 60_000 }), { value: 1 });
  assert.equal(calls, 1);

  let failingCalls = 0;
  const failingLoader = async () => {
    failingCalls += 1;
    if (failingCalls === 1) throw new Error('temporary');
    return 'recovered';
  };
  await assert.rejects(cache.getOrFetch('retriable', failingLoader));
  assert.equal(await cache.getOrFetch('retriable', failingLoader), 'recovered');
  assert.equal(failingCalls, 2);
});

test('query cache invalidation, expiry, and caller cancellation remain isolated', async () => {
  let now = 0;
  const cache = new QueryCache({ now: () => now });
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return calls;
  };

  assert.equal(await cache.getOrFetch('value', loader, { staleTimeMs: 10 }), 1);
  now = 11;
  assert.equal(await cache.getOrFetch('value', loader, { staleTimeMs: 10 }), 2);
  cache.invalidate('value');
  assert.equal(await cache.getOrFetch('value', loader, { staleTimeMs: 10 }), 3);

  let resolveSlow: ((value: string) => void) | undefined;
  const controller = new AbortController();
  const pending = cache.getOrFetch('slow', () => new Promise<string>((resolve) => {
    resolveSlow = resolve;
  }), { staleTimeMs: 10, signal: controller.signal });
  controller.abort('route-change');
  await assert.rejects(pending, (error: unknown) => error instanceof ApiClientError && error.code === 'ABORTED');
  resolveSlow?.('finished');
  assert.equal(await cache.getOrFetch('slow', async () => 'unexpected', { staleTimeMs: 10 }), 'finished');
});
