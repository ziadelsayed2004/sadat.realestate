import fs from 'node:fs';
import { chromium } from '@playwright/test';

const screenId = process.argv[2];
const route = process.argv[3];
if (!screenId || !route) throw new Error('Usage: node scripts/inspect-captured-layout.mjs SCREEN_ID ROUTE');
const root = process.cwd();
const queue = JSON.parse(fs.readFileSync(`${root}/docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json`, 'utf8'));
const entry = queue.screens.find(item => item.screenId === screenId);
if (!entry) throw new Error(`Unknown screen: ${screenId}`);
const state = JSON.parse(fs.readFileSync(`${root}/docs/quality/figma_parity/screens/${screenId}/deterministic-state.json`, 'utf8'));
const width = Number(entry.evidence.figmaScreenshot.width);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width, height: 720 }, deviceScaleFactor: 1, locale: 'ar' });
const page = await context.newPage();
await page.route('**/api/v1/**', async requestRoute => {
  const url = requestRoute.request().url();
  if (url.includes('/article-categories')) {
    const categories = state.relatedResponses?.articleCategories;
    if (categories) return requestRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) });
  }
  if (url.includes('/articles') && state.relatedResponses?.relatedArticles && !url.includes('/articles/buying-in-sadat')) {
    return requestRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.relatedResponses.relatedArticles) });
  }
  if (url.includes('/public/properties') && state.relatedResponses?.relatedProperties) {
    return requestRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.relatedResponses.relatedProperties) });
  }
  return requestRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.response) });
});
const targetUrl = `http://127.0.0.1:4173${route}${route.includes('?') ? '&' : '?'}lang=ar`;
await page.goto(targetUrl, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await document.fonts.ready;
  for (const image of document.images) if (image.complete && image.naturalWidth > 0) await image.decode().catch(() => undefined);
});
const result = await page.evaluate(() => {
  const selectors = [
    'header', '.public-homepage__brand', '.public-homepage__nav', '.public-homepage__actions',
    '.public-property-comparison__intro', '.public-property-comparison__selection', '.public-property-comparison__cards', '.public-property-comparison__card', '.public-property-comparison__card .ui-property-card__media', '.public-property-comparison__details', '.public-property-comparison__group', '.public-property-comparison__sticky-bar',
    '.public-developer-directory__intro', '.public-developer-directory__intro h1', '.public-developer-directory__intro p', '.public-developer-directory__body', '.public-developer-directory__filters', '.public-developer-directory__results', '.public-developer-directory__toolbar', '.public-developer-directory__grid', '.public-developer-directory__card', '.public-developer-directory__card-media', '.public-developer-directory__card-badges', '.public-developer-directory__card-body', '.public-developer-directory__card-body h2', '.public-developer-directory__card-description', '.public-developer-directory__card-meta', '.public-developer-directory__footer',
    '.public-developer-profile__content', '.public-developer-profile__hero-media', '.public-developer-profile__hero-body', '.public-developer-profile__tabs', '.public-developer-profile__sections', '.public-developer-profile__section', '.public-developer-profile__project-grid', '.public-developer-profile__project-card', '.public-developer-profile__property-grid', '.public-developer-profile__property-card', '.public-developer-profile__contact',
    '.public-articles__intro', '.public-articles__intro h1', '.public-articles__intro p', '.public-articles__intro input', '.public-articles__categories', '.public-articles__categories button', '.public-articles__results', '.public-articles__toolbar', '.public-articles__grid', '.public-articles__card', '.public-articles__card-media', '.public-articles__card-category', '.public-articles__card-body', '.public-articles__card-body h2', '.public-articles__card-summary', '.public-articles__card-meta', '.public-articles__cta', '.public-articles__footer',
    '.public-article-details__content', '.public-article-details__back', '.public-article-details__detail-layout', '.public-article-details__property-rail', '.public-article-details__property', '.public-article-details__article', '.public-article-details__hero', '.public-article-details__hero-media', '.public-article-details__hero-copy', '.public-article-details__body', '.public-article-details__related', '.public-article-details__related-grid'
  ];
  const describe = element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { className: element.className, x: Number(rect.x.toFixed(2)), y: Number(rect.y.toFixed(2)), width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2)), display: style.display, gridTemplateColumns: style.gridTemplateColumns, gridTemplateRows: style.gridTemplateRows, gap: style.gap, padding: style.padding, margin: style.margin, fontSize: style.fontSize, lineHeight: style.lineHeight, fontWeight: style.fontWeight, borderRadius: style.borderRadius, loading: element.tagName === 'IMG' ? element.loading : undefined };
  };
  const all = [...document.querySelectorAll('header, footer, main, section, aside, nav, article, [class*="public-"]')];
  return { viewport: { width: innerWidth, height: innerHeight }, elements: Object.fromEntries(selectors.map(selector => [selector, [...document.querySelectorAll(selector)].slice(0, 8).map(describe)])), bodyHeight: document.documentElement.scrollHeight, all: all.map(describe).slice(0, 180) };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
