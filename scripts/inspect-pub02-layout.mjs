import { chromium } from '@playwright/test';
import { publicPropertyListFixture } from '../apps/web/tests/e2e/public-fixtures.ts';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 720 }, locale: 'ar' });
await page.route('**/api/v1/public/properties**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(publicPropertyListFixture()) }));
await page.goto('http://127.0.0.1:4173/properties?lang=ar', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const selectors = ['.public-property-listing__intro', '.public-property-listing__category-rail', '.public-property-listing__body', '.public-property-listing__toolbar', '.public-property-listing__cards', '.public-property-listing__card', '.public-property-listing__card .ui-property-card__media', '.public-property-listing__card .ui-property-card__body', '.public-property-listing__card h3', '.public-property-listing__card .ui-property-card__location', '.public-property-listing__card .ui-property-card__price', '.public-property-listing__card .ui-property-card__features', '.public-property-listing__card .ui-property-card__source', '.public-property-listing__card .ui-property-card__action', '.public-property-listing__filters', '.public-site-footer'];
const result = await page.evaluate(values => Object.fromEntries(values.map(selector => {
  const element = document.querySelector(selector);
  if (!element) return [selector, null];
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return [selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, marginBlockStart: style.marginBlockStart, marginBlockEnd: style.marginBlockEnd, alignSelf: style.alignSelf, translate: style.translate, transform: style.transform, rowGap: style.rowGap, minBlockSize: style.minBlockSize, gridTemplateRows: style.gridTemplateRows, padding: style.padding, fontFamily: style.fontFamily, fontSize: style.fontSize, lineHeight: style.lineHeight }];
})), selectors);
console.log(JSON.stringify(result, null, 2));
console.log(JSON.stringify(await page.evaluate(() => {
  const element = document.querySelector('.public-property-listing__card');
  const matches = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const visit = values => {
      for (const rule of values) {
        if ('cssRules' in rule) visit(rule.cssRules);
        if ('selectorText' in rule && element?.matches(rule.selectorText) && (rule.style.marginBlockStart || rule.style.marginTop || rule.style.margin)) matches.push({ selector: rule.selectorText, margin: rule.style.margin, marginTop: rule.style.marginTop, marginBlockStart: rule.style.marginBlockStart });
      }
    };
    visit(rules);
  }
  return matches;
}), null, 2));
await browser.close();
