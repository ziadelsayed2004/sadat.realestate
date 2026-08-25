const baseUrl = (process.env.SMOKE_BASE_URL?.trim() || 'http://localhost:8080').replace(/\/$/u, '');
const apiBaseUrl = (process.env.SMOKE_API_BASE_URL?.trim() || `http://127.0.0.1:${process.env.API_PORT || '3000'}`).replace(/\/$/u, '');
const requireSeeded = process.env.SMOKE_REQUIRE_SEEDED === 'true' || process.argv.includes('--require-seeded');

async function request(base, pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, {
    redirect: 'manual',
    signal: globalThis.AbortSignal.timeout(15_000),
    ...options,
    headers: { Accept: '*/*', 'X-Smoke-Test': 'safe-read-only', ...(options.headers || {}) }
  });
  const body = await response.text();
  return { response, body };
}

function json(base, pathname) {
  return request(base, pathname, { headers: { Accept: 'application/json' } }).then(async result => {
    let payload;
    try { payload = JSON.parse(result.body); } catch { payload = undefined; }
    return { ...result, payload };
  });
}

function listCount(payload) {
  if (Array.isArray(payload?.data)) return payload.data.length;
  return Array.isArray(payload?.data?.items) ? payload.data.items.length : 0;
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

try {
  const [proxyHealth, apiHealth, readiness, homePage] = await Promise.all([
    json(baseUrl, '/health'),
    json(apiBaseUrl, '/health'),
    json(apiBaseUrl, '/ready'),
    request(baseUrl, '/')
  ]);
  assert(proxyHealth.response.ok && proxyHealth.payload?.status === 'ok', 'PROXY_HEALTH_INVALID');
  assert(apiHealth.response.ok && apiHealth.payload?.status === 'ok', 'API_HEALTH_INVALID');
  assert(readiness.response.ok && readiness.payload?.status === 'ready', 'API_READINESS_INVALID');
  assert(readiness.payload?.checks?.mongodb === 'ready', 'MONGODB_READINESS_INVALID');
  assert(homePage.response.ok && /<html[\s>]/iu.test(homePage.body), 'HOMEPAGE_INVALID');

  const asset = homePage.body.match(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/iu)?.[1];
  if (asset && !asset.startsWith('data:')) {
    const assetPath = asset.startsWith('/') ? asset : `/${asset}`;
    const assetResponse = await request(baseUrl, assetPath);
    assert(assetResponse.response.ok, 'STATIC_ASSET_INVALID');
  }
  const spa = await request(baseUrl, '/properties');
  assert(spa.response.ok && /<html[\s>]/iu.test(spa.body), 'SPA_FALLBACK_INVALID');

  const [home, properties, developers, articles, community, about] = await Promise.all([
    json(baseUrl, '/api/v1/public/home'),
    json(baseUrl, '/api/v1/public/properties?page=1&limit=20'),
    json(baseUrl, '/api/v1/public/developers?page=1&limit=20'),
    json(baseUrl, '/api/v1/public/articles?page=1&limit=20'),
    json(baseUrl, '/api/v1/public/community/posts'),
    json(baseUrl, '/api/v1/public/about')
  ]);
  for (const response of [home, properties, developers, articles, community, about]) assert(response.response.ok, 'PUBLIC_API_ROUTE_INVALID');
  const counts = {
    properties: listCount(properties.payload),
    developers: listCount(developers.payload),
    articles: listCount(articles.payload),
    community: listCount(community.payload),
    about: listCount(about.payload),
    homepageProperties: home.payload?.data?.properties?.length ?? 0
  };
  if (requireSeeded) assert(Object.values(counts).some(count => count < 1) === false, 'SYNTHETIC_SEED_NOT_VISIBLE');

  const invalidApi = await request(baseUrl, '/api/v1/route-that-does-not-exist', { headers: { Accept: 'application/json' } });
  assert(invalidApi.response.status === 404, 'INVALID_API_ROUTE_NOT_404');
  const privateFile = await request(baseUrl, '/api/v1/private/provider-documents/nonexistent', { headers: { Accept: 'application/json' } });
  assert(privateFile.response.status !== 200, 'PRIVATE_FILE_ROUTE_EXPOSED');
  const compressed = await request(baseUrl, '/', { headers: { 'Accept-Encoding': 'gzip, br' } });
  const contentEncoding = compressed.response.headers.get('content-encoding') || 'none';
  const securityHeaders = ['content-security-policy', 'x-content-type-options', 'referrer-policy'].filter(name => compressed.response.headers.has(name));
  process.stdout.write(`RUNTIME_SMOKE_OK ${JSON.stringify({ counts, apiReady: true, invalidApi: invalidApi.response.status, privateFile: privateFile.response.status, contentEncoding, securityHeaders })}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message.replace(/[^A-Za-z0-9_]+/gu, '_') : 'UNKNOWN';
  process.stderr.write(`RUNTIME_SMOKE_FAILED ${message}\n`);
  process.exitCode = 1;
}
