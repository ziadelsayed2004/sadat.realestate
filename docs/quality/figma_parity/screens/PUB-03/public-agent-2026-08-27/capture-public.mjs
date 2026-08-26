import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from '@playwright/test';

const root = process.cwd();
const screenId = String(process.argv[2] ?? '');
const baseUrl = String(process.env.PUBLIC_AGENT_BASE_URL ?? 'http://127.0.0.1:4174');
const artifactRoot = path.resolve(root, 'docs/quality/figma_parity/screens/PUB-03/public-agent-2026-08-27');
const screenConfig = {
  'PUB-01': { route: '/', pageName: 'public-home', apiPath: '/api/v1/public/home', referenceWidth: 1549 },
  'PUB-02': { route: '/properties', pageName: 'public-properties', apiPath: '/api/v1/public/properties', referenceWidth: 1577 },
  'PUB-03': { route: '/properties/published-home', pageName: 'public-property-details', apiPath: '/api/v1/public/properties/published-home', referenceWidth: 1577 },
  'PUB-04': { route: '/compare?propertyIds=aaaaaaaaaaaaaaaaaaaaaaaa&propertyIds=bbbbbbbbbbbbbbbbbbbbbbbb', pageName: 'public-comparison', apiPath: '/api/v1/public/properties/compare', referenceWidth: 1653 },
  'PUB-05': { route: '/developers', pageName: 'public-developers', apiPath: '/api/v1/public/developers', referenceWidth: 1523 },
  'PUB-06': { route: '/developers/approved-builder', pageName: 'public-developer-profile', apiPath: '/api/v1/public/developers/approved-builder', referenceWidth: 1534 },
  'PUB-07': { route: '/articles', pageName: 'public-articles', apiPath: '/api/v1/public/articles', referenceWidth: 1523 },
  'PUB-08': { route: '/articles/buying-in-sadat', pageName: 'public-article-details', apiPath: '/api/v1/public/articles/buying-in-sadat', referenceWidth: 1523 }
};
if (!(screenId in screenConfig)) throw new Error(`Unsupported public screen: ${screenId}`);

const config = screenConfig[screenId];
const sourcePath = path.resolve(root, `docs/quality/figma_parity/screens/${screenId}/figma.png`);
const statePath = path.resolve(root, `docs/quality/figma_parity/screens/${screenId}/deterministic-state.json`);
const outputDir = path.join(artifactRoot, screenId);
const runtimePath = path.join(outputDir, 'runtime-ar.png');
const diffPath = path.join(outputDir, 'diff-review.png');
const metadataPath = path.join(outputDir, 'capture.json');
fs.mkdirSync(outputDir, { recursive: true });

const deterministicState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const primaryEnvelope = deterministicState.response;
const related = deterministicState.relatedResponses ?? {};
const responseFor = (pathname) => {
  if (pathname === config.apiPath) return primaryEnvelope;
  if (screenId === 'PUB-07' && pathname === '/api/v1/public/article-categories') return related.articleCategories;
  if (screenId === 'PUB-08' && pathname === '/api/v1/public/articles/buying-in-sadat') return primaryEnvelope;
  if (screenId === 'PUB-08' && pathname === '/api/v1/public/properties') return related.relatedProperties;
  if (screenId === 'PUB-08' && pathname === '/api/v1/public/articles') return related.relatedArticles;
  if (screenId === 'PUB-07' && pathname === '/api/v1/public/articles') return primaryEnvelope;
  return undefined;
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: config.referenceWidth, height: 720 }, deviceScaleFactor: 1, locale: 'ar' });
const page = await context.newPage();
const requestedApi = [];
const apiResponses = [];
page.on('request', (request) => {
  if (request.url().includes('/api/v1/')) requestedApi.push({ method: request.method(), url: request.url() });
});
page.on('response', (response) => {
  if (response.url().includes('/api/v1/')) apiResponses.push({ method: response.request().method(), url: response.url(), status: response.status() });
});
await page.route('**/api/v1/**', async (route) => {
  const pathname = new URL(route.request().url()).pathname;
  const envelope = responseFor(pathname);
  if (envelope === undefined) {
    await route.continue();
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope).replaceAll('http://127.0.0.1:4173', baseUrl) });
});

const target = new URL(config.route, baseUrl);
target.searchParams.set('lang', 'ar');
const navigation = await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
await page.locator(`[data-page="${config.pageName}"]`).waitFor({ state: 'visible', timeout: 15_000 });
await page.addStyleTag({ content: `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
` });
const readiness = await page.evaluate(async () => {
  await document.fonts.ready;
  const images = Array.from(document.images);
  const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
  const step = Math.max(Math.floor(window.innerHeight * 0.8), 1);
  for (let y = 0; y < scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }
  window.scrollTo(0, 0);
  await Promise.all(images.map(async image => {
    if (image.complete) {
      try { await image.decode(); } catch { /* safe fallback image may not decode */ }
      return;
    }
    await Promise.race([
      image.decode().catch(() => undefined),
      new Promise(resolve => setTimeout(resolve, 5_000))
    ]);
  }));
  await document.fonts.ready;
  return {
    height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
    fonts: { status: document.fonts.status, ready: document.fonts.status === 'loaded' },
    images: images.map(image => ({ src: image.getAttribute('src'), complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }))
  };
});
await page.waitForTimeout(100);
await page.screenshot({ path: runtimePath, fullPage: true });

const dom = await page.evaluate(({ pageName }) => {
  const pageRoot = document.querySelector(`[data-page="${pageName}"]`);
  const selectorList = [
    '.public-homepage__header', '.public-homepage__content', '.public-site-footer',
    '.public-property-details__content', '.public-property-details__layout', '.public-property-details__main-column', '.public-property-details__actions', '.public-property-details__gallery', '.public-property-details__summary', '.public-property-details__source-card', '.public-property-details__description', '.public-property-details__amenities', '.public-property-details__nearby', '.public-property-details__advisory', '.public-property-details__related', '.public-property-details__related-grid', '.public-property-details__related-card', '.public-property-details__contact',
    '.public-property-comparison__intro', '.public-property-comparison__selection', '.public-property-comparison__cards', '.public-property-comparison__card', '.public-property-comparison__details', '.public-property-comparison__group', '.public-property-comparison__sticky-bar',
    '.public-developer-directory__intro', '.public-developer-directory__body', '.public-developer-directory__filters', '.public-developer-directory__results', '.public-developer-directory__toolbar', '.public-developer-directory__grid', '.public-developer-directory__card', '.public-developer-directory__card-media', '.public-developer-directory__card-body', '.public-developer-directory__footer',
    '.public-developer-profile__content', '.public-developer-profile__hero', '.public-developer-profile__hero-media', '.public-developer-profile__hero-body', '.public-developer-profile__identity', '.public-developer-profile__identity-actions', '.public-developer-profile__identity-copy', '.public-developer-profile__identity-logo', '.public-developer-profile__metrics', '.public-developer-profile__tabs', '.public-developer-profile__sections', '.public-developer-profile__section', '.public-developer-profile__project-grid', '.public-developer-profile__project-card', '.public-developer-profile__property-grid', '.public-developer-profile__property-card', '.public-developer-profile__contact',
    '.public-articles__intro', '.public-articles__results', '.public-articles__toolbar', '.public-articles__grid', '.public-articles__card', '.public-articles__card-media', '.public-articles__card-body', '.public-articles__cta',
    '.public-article-details__content', '.public-article-details__back', '.public-article-details__hero', '.public-article-details__hero-media', '.public-article-details__hero-copy', '.public-article-details__body', '.public-article-details__related', '.public-article-details__related-grid',
    'table', 'thead', 'tbody', 'tr'
  ];
  const layout = Object.fromEntries(selectorList.map(selector => [selector, [...document.querySelectorAll(selector)].slice(0, 8).map(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      x: Number(rect.x.toFixed(2)), y: Number((rect.y + window.scrollY).toFixed(2)), width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2)),
      display: style.display, gap: style.gap, padding: style.padding, minHeight: style.minHeight, borderColor: style.borderColor, background: style.backgroundColor, fontSize: style.fontSize, lineHeight: style.lineHeight
    };
  })]));
  return {
    html: { lang: document.documentElement.lang, dir: document.documentElement.dir },
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    page: { visible: pageRoot instanceof HTMLElement, scrollHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0) },
    layout,
    structure: {
      headers: document.querySelectorAll('h1,h2,h3').length,
      navs: document.querySelectorAll('nav').length,
      sections: document.querySelectorAll('section').length,
      cards: document.querySelectorAll('[class*="card"]').length,
      images: document.images.length,
      forms: document.forms.length
    }
  };
}, { pageName: config.pageName });

const sourceDataUrl = `data:image/png;base64,${fs.readFileSync(sourcePath).toString('base64')}`;
const runtimeDataUrl = `data:image/png;base64,${fs.readFileSync(runtimePath).toString('base64')}`;
const diffPage = await context.newPage();
const comparison = await diffPage.evaluate(async ({ sourceDataUrl: sourceUrl, runtimeDataUrl: runtimeUrl }) => {
  const load = async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
  };
  const source = await load(sourceUrl);
  const runtime = await load(runtimeUrl);
  const width = Math.min(source.naturalWidth, runtime.naturalWidth);
  const height = Math.min(source.naturalHeight, runtime.naturalHeight);
  const sourceCanvas = document.createElement('canvas');
  const runtimeCanvas = document.createElement('canvas');
  const diffCanvas = document.createElement('canvas');
  sourceCanvas.width = runtimeCanvas.width = width;
  sourceCanvas.height = runtimeCanvas.height = height;
  diffCanvas.width = width * 3;
  diffCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const runtimeContext = runtimeCanvas.getContext('2d', { willReadFrequently: true });
  const diffContext = diffCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext || !runtimeContext || !diffContext) throw new Error('Canvas unavailable');
  sourceContext.drawImage(source, 0, 0);
  runtimeContext.drawImage(runtime, 0, 0);
  const sourcePixels = sourceContext.getImageData(0, 0, width, height).data;
  const runtimePixels = runtimeContext.getImageData(0, 0, width, height).data;
  const diffPixels = diffContext.createImageData(width, height);
  let material = 0;
  let antiAliasing = 0;
  let totalDifference = 0;
  for (let index = 0; index < sourcePixels.length; index += 4) {
    const difference = Math.abs(sourcePixels[index] - runtimePixels[index])
      + Math.abs(sourcePixels[index + 1] - runtimePixels[index + 1])
      + Math.abs(sourcePixels[index + 2] - runtimePixels[index + 2]);
    totalDifference += difference;
    if (difference > 24) material += 1;
    if (difference > 3) antiAliasing += 1;
    const pixel = index;
    if (difference > 24) {
      diffPixels.data[pixel] = 255;
      diffPixels.data[pixel + 1] = 30;
      diffPixels.data[pixel + 2] = 30;
      diffPixels.data[pixel + 3] = 255;
    } else if (difference > 3) {
      diffPixels.data[pixel] = 255;
      diffPixels.data[pixel + 1] = 204;
      diffPixels.data[pixel + 2] = 0;
      diffPixels.data[pixel + 3] = 255;
    } else {
      diffPixels.data[pixel] = 245;
      diffPixels.data[pixel + 1] = 245;
      diffPixels.data[pixel + 2] = 245;
      diffPixels.data[pixel + 3] = 255;
    }
  }
  diffContext.putImageData(diffPixels, width * 2, 0);
  diffContext.drawImage(sourceCanvas, 0, 0);
  diffContext.drawImage(runtimeCanvas, width, 0);
  return {
    source: { width: source.naturalWidth, height: source.naturalHeight },
    runtime: { width: runtime.naturalWidth, height: runtime.naturalHeight },
    compared: { width, height, pixels: width * height },
    materialDifferencePercent: Number((material / (width * height) * 100).toFixed(4)),
    antiAliasingOnlyPercent: Number((antiAliasing / (width * height) * 100).toFixed(4)),
    meanRgbDifference: Number((totalDifference / (width * height)).toFixed(4)),
    diffDataUrl: diffCanvas.toDataURL('image/png')
  };
}, { sourceDataUrl, runtimeDataUrl });
fs.writeFileSync(diffPath, Buffer.from(comparison.diffDataUrl.split(',')[1], 'base64'));
const capture = {
  schemaVersion: 1,
  screenId,
  route: target.pathname + target.search,
  baseUrl,
  source: { path: sourcePath, sha256: crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex') },
  runtime: { path: runtimePath, sha256: crypto.createHash('sha256').update(fs.readFileSync(runtimePath)).digest('hex'), navigationStatus: navigation?.status() ?? null },
  api: { requested: requestedApi, responses: apiResponses },
  readiness,
  dom,
  comparison: { ...comparison, diffDataUrl: undefined, diffPath }
};
fs.writeFileSync(metadataPath, `${JSON.stringify(capture, null, 2)}\n`);
await diffPage.close();
await page.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ screenId, outputDir, runtimePath, diffPath, metadataPath, comparison: capture.comparison, api: capture.api, readiness, dom }, null, 2));
