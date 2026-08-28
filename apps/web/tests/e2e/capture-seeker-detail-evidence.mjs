import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const args = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--') ? [[value.slice(2), values[index + 1] ?? true]] : []));
const screenId = String(args.get('screen-id') ?? '');
const locale = String(args.get('locale') ?? 'ar');
const revision = String(args.get('revision') ?? '').trim();
const baseUrl = String(args.get('base-url') ?? process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4175');
if (!['SEK-03', 'SEK-04'].includes(screenId)) throw new Error(`Only SEK-03 and SEK-04 are supported; received ${screenId}`);
if (!['ar', 'en'].includes(locale)) throw new Error(`Only Arabic and English are supported; received ${locale}`);
if (!/^[a-z0-9-]+$/u.test(revision)) throw new Error(`A lowercase capture revision is required; received ${revision}`);

const queue = JSON.parse(fs.readFileSync(path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json'), 'utf8'));
const queueEntry = queue.screens.find(entry => entry.screenId === screenId);
if (queueEntry === undefined) throw new Error(`Missing queue entry for ${screenId}`);
const evidenceDir = path.join(root, 'docs/quality/figma_parity/screens', screenId);
const figmaPath = path.join(evidenceDir, 'figma.png');
const beforePath = path.join(evidenceDir, 'runtime-before.png');
const afterName = `runtime-after-${revision}`;
const afterPath = path.join(evidenceDir, `${afterName}.png`);
const diffName = `diff-${revision}`;
const metricsName = `visual-metrics-${revision}`;
const deterministicName = `deterministic-state-${revision}`;
if (!fs.existsSync(figmaPath) || !fs.existsSync(beforePath)) throw new Error(`Missing protected before/source evidence for ${screenId}`);
if (fs.existsSync(afterPath)) throw new Error(`Refusing to overwrite ${afterPath}`);

function pngDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const ids = {
  seeker: '0123456789abcdef01234567',
  request: 'bbbbbbbbbbbbbbbbbbbbbbbb'
};
const status = screenId === 'SEK-03' ? 'under_review' : 'contacted';
const request = {
  id: ids.request,
  type: 'property_search',
  source: 'seeker',
  seekerId: ids.seeker,
  status,
  payload: { locations: ['First District'], propertyTypes: ['apartment'], minBudget: 500000, maxBudget: 2500000, minBedrooms: 2, maxBedrooms: 4, note: 'Looking for a finished home in Sadat City.' },
  version: 0,
  availableActions: status === 'under_review' ? ['start_review', 'contact'] : ['schedule'],
  createdAt: '2026-07-23T09:00:00.000Z',
  updatedAt: '2026-07-23T10:00:00.000Z'
};
const session = { accessToken: 'capture.header.signature', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: ids.seeker, roleType: 'seeker', status: 'verified' } };
const envelope = data => ({ data, meta: { requestId: `capture-${screenId}-${locale}` } });
const sourceDimensions = pngDimensions(figmaPath);
const targetUrl = new URL(`/seeker/requests/${ids.request}`, baseUrl);
targetUrl.searchParams.set('lang', locale);
const seedState = {
  schemaVersion: 1,
  seedId: `capture-${screenId}-${locale}-${revision}`,
  environment: 'non-production-browser-fixture',
  canonicalFigmaFileKey: queue.canonicalFigmaFileKey,
  forbiddenFigmaFileKey: queue.forbiddenFigmaFileKey,
  screenId,
  source: { pageId: queueEntry.clone.pageId, nodeId: queueEntry.clone.nodeId, url: queueEntry.clone.url, screenshot: `docs/quality/figma_parity/screens/${screenId}/figma.png` },
  runtime: { route: targetUrl.pathname + targetUrl.search, requestedQueueRoute: queueEntry.runtime.route, role: 'seeker', locale, direction: locale === 'ar' ? 'rtl' : 'ltr', viewport: { width: sourceDimensions.width, height: sourceDimensions.height, deviceScaleFactor: 1 } },
  authSession: { roleType: 'seeker', projection: session, source: 'intercepted /api/v1/auth/refresh response' },
  api: { fixtureContract: 'real writable API response shapes', responseRequestIds: [`capture-${screenId}-${locale}`], requestStatus: status },
  phase: 'after',
  repair: { repairId: revision, expectedEffect: 'capture the status-specific request detail state with the Seeker desktop shell and safe projection' }
};
const seedJson = JSON.stringify(seedState);
seedState.seedSha256 = crypto.createHash('sha256').update(seedJson).digest('hex');
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, `${deterministicName}.json`), `${JSON.stringify(seedState, null, 2)}\n`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: sourceDimensions.width, height: sourceDimensions.height }, deviceScaleFactor: 1, locale, colorScheme: 'light' });
const page = await context.newPage();
const apiRequests = [];
const apiResponses = [];
const routeHits = [];
page.on('request', event => { if (event.url().includes('/api/v1/')) apiRequests.push({ method: event.method(), url: event.url() }); });
page.on('response', event => { if (event.url().includes('/api/v1/')) apiResponses.push({ method: event.request().method(), url: event.url(), status: event.status() }); });
await page.route('**/api/v1/**', async route => {
  const event = route.request();
  const pathname = new URL(event.url()).pathname.replace('/api/v1', '');
  routeHits.push({ method: event.method(), pathname });
  if (pathname === '/auth/refresh') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(session)), headers: { 'cache-control': 'no-store' } });
  if (pathname === `/seeker/requests/${ids.request}`) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(request)), headers: { 'cache-control': 'no-store' } });
  return route.continue();
});

await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.locator(`[data-screen-id="${screenId}"]`).waitFor({ state: 'visible', timeout: 30_000 });
await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }' });
await page.evaluate(async () => {
  await document.fonts.ready;
  const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
  const step = Math.max(Math.floor(window.innerHeight * 0.8), 1);
  for (let y = 0; y < scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }
  window.scrollTo(0, 0);
  await document.fonts.ready;
});
await page.waitForTimeout(100);
await page.screenshot({ path: afterPath, fullPage: true });
const afterHash = crypto.createHash('sha256').update(fs.readFileSync(afterPath)).digest('hex');
const beforeHash = crypto.createHash('sha256').update(fs.readFileSync(beforePath)).digest('hex');
if (afterHash === beforeHash) throw new Error(`After capture duplicated runtime-before.png for ${screenId}`);
const runtimeDimensions = pngDimensions(afterPath);
const dom = await page.evaluate(expectedId => {
  const screen = document.querySelector(`[data-screen-id="${expectedId}"]`);
  const text = document.body.innerText;
  const serializedSensitiveField = /\b(?:assignedTo|internalNotes|auditData|providerId|seekerId|recipientId|providerDocument|accessToken|refreshToken|password|secret)\s*[:=]/u;
  return {
    screenId: screen?.getAttribute('data-screen-id') ?? null,
    requestStatus: screen?.getAttribute('data-request-status') ?? null,
    html: { lang: document.documentElement.lang, dir: document.documentElement.dir },
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    page: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0) },
    safeProjection: { serializedSensitiveFieldVisible: serializedSensitiveField.test(text), visibleTextLength: text.length },
    structure: { headers: document.querySelectorAll('header').length, navs: document.querySelectorAll('nav').length, sections: document.querySelectorAll('section').length, links: document.querySelectorAll('a[href]').length, buttons: document.querySelectorAll('button').length }
  };
}, screenId);

const encoded = filePath => `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
const comparePage = await context.newPage({ viewport: { width: sourceDimensions.width, height: sourceDimensions.height } });
const comparison = await comparePage.evaluate(async ({ figma, before, after, afterLabel }) => {
  const load = source => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source; });
  const [figmaImage, beforeImage, afterImage] = await Promise.all([load(figma), load(before), load(after)]);
  const scale = 0.34;
  const columns = [figmaImage, beforeImage, afterImage];
  const widths = columns.map(image => Math.max(1, Math.round(image.naturalWidth * scale)));
  const heights = columns.map(image => Math.max(1, Math.round(image.naturalHeight * scale)));
  const canvas = document.createElement('canvas');
  canvas.width = widths.reduce((sum, value) => sum + value, 0);
  canvas.height = Math.max(...heights) + 44;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  let x = 0;
  ['FIGMA REFERENCE', 'RUNTIME BEFORE', 'RUNTIME AFTER (REPAIRED)'].forEach((label, index) => { context.fillStyle = '#111827'; context.font = 'bold 14px Arial'; context.fillText(label, x + 8, 22); context.drawImage(columns[index], x, 44, widths[index], heights[index]); x += widths[index]; });
  const compareWidth = figmaImage.naturalWidth;
  const compareHeight = Math.min(figmaImage.naturalHeight, afterImage.naturalHeight);
  const compareCanvas = document.createElement('canvas');
  compareCanvas.width = compareWidth;
  compareCanvas.height = compareHeight;
  const compareContext = compareCanvas.getContext('2d', { willReadFrequently: true });
  compareContext.drawImage(figmaImage, 0, 0, compareWidth, compareHeight);
  const expected = compareContext.getImageData(0, 0, compareWidth, compareHeight).data;
  compareContext.clearRect(0, 0, compareWidth, compareHeight);
  compareContext.drawImage(afterImage, 0, 0, compareWidth, compareHeight);
  const actual = compareContext.getImageData(0, 0, compareWidth, compareHeight).data;
  let materialPixels = 0;
  let antiAliasingOnlyPixels = 0;
  for (let index = 0; index < expected.length; index += 4) {
    const delta = Math.abs(expected[index] - actual[index]) + Math.abs(expected[index + 1] - actual[index + 1]) + Math.abs(expected[index + 2] - actual[index + 2]);
    if (delta > 24) materialPixels += 1;
    else if (delta > 3) antiAliasingOnlyPixels += 1;
  }
  const comparedPixels = compareWidth * compareHeight;
  return { dataUrl: canvas.toDataURL('image/png'), visualMetrics: { comparedWidth: compareWidth, comparedHeight: compareHeight, comparedPixels, materialDifferencePercent: Number(((materialPixels / comparedPixels) * 100).toFixed(4)), antiAliasingOnlyPercent: Number(((antiAliasingOnlyPixels / comparedPixels) * 100).toFixed(4)), threshold: { materialRgbSumGreaterThan: 24, antiAliasingRgbSumGreaterThan: 3 }, method: 'unmasked same-width source/runtime canvas comparison over overlapping document height', comparedCapture: afterLabel } };
}, { figma: encoded(figmaPath), before: encoded(beforePath), after: encoded(afterPath), afterLabel: afterName });
fs.writeFileSync(path.join(evidenceDir, `${diffName}.png`), Buffer.from(comparison.dataUrl.split(',')[1], 'base64'));
fs.writeFileSync(path.join(evidenceDir, `${metricsName}.json`), `${JSON.stringify({ schemaVersion: 1, screenId, phase: 'after', source: sourceDimensions, runtimeBefore: pngDimensions(beforePath), runtimeAfter: runtimeDimensions, ...comparison.visualMetrics, reviewed: false, reviewedAt: null }, null, 2)}\n`);
fs.writeFileSync(path.join(evidenceDir, `${afterName}-capture.json`), `${JSON.stringify({ schemaVersion: 1, screenId, phase: 'after', capturedAt: new Date().toISOString(), runtime: { route: targetUrl.pathname + targetUrl.search, requestedQueueRoute: queueEntry.runtime.route, role: 'seeker', permissions: { requiredRole: 'seeker', ownership: 'seeker' }, locale, direction: locale === 'ar' ? 'rtl' : 'ltr', viewport: dom.viewport, deterministicState: { path: `docs/quality/figma_parity/screens/${screenId}/${deterministicName}.json`, seedId: seedState.seedId, seedSha256: seedState.seedSha256 }, capture: { phase: 'after', path: `docs/quality/figma_parity/screens/${screenId}/${afterName}.png`, sha256: afterHash }, beforeHash, afterHash, apiRequests, apiResponses, routeHits }, page: { requestStatus: dom.requestStatus, shell: { routeId: 'seeker', deviceScope: 'desktop' }, structure: dom.structure, transitions: { links: await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent?.trim() ?? '', href: node.getAttribute('href') }))), buttons: await page.locator('button').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent?.trim() ?? '', aria: node.getAttribute('aria-label'), disabled: node.hasAttribute('disabled') }))) }, html: dom.html, safeProjection: dom.safeProjection, viewport: dom.viewport, pageMetrics: dom.page }, comparison: { diffPath: `docs/quality/figma_parity/screens/${screenId}/${diffName}.png`, visualMetricsPath: `docs/quality/figma_parity/screens/${screenId}/${metricsName}.json`, visualMetrics: comparison.visualMetrics } }, null, 2)}\n`);
await comparePage.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ screenId, locale, direction: locale === 'ar' ? 'rtl' : 'ltr', status, sourceDimensions, runtimeDimensions, materialDifferencePercent: comparison.visualMetrics.materialDifferencePercent, antiAliasingOnlyPercent: comparison.visualMetrics.antiAliasingOnlyPercent, evidenceDir }, null, 2));
