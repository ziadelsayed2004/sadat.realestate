import { chromium } from '@playwright/test';
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync('docs/quality/figma_parity/screens/PUB-03/deterministic-state.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 720 } });
await page.route('**/api/v1/public/properties/published-home**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.response) }));
await page.goto('http://127.0.0.1:4173/properties/published-home?lang=ar', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => undefined))); });

const result = await page.evaluate(() => {
  const rangeBox = element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, color: style.color };
  };
  const values = {};
  const h1 = document.querySelector('.public-property-details__summary h1');
  const description = document.querySelector('.public-property-details__description p');
  const advisory = document.querySelector('.public-property-details__advisory p');
  const relatedTitle = document.querySelector('.public-property-details__related .ui-property-card__title');
  for (const size of [22, 23, 24, 25, 26, 27]) {
    h1.style.fontSize = `${size}px`;
    values[`h1-${size}`] = rangeBox(h1);
  }
  for (const weight of [400, 500, 600, 700]) {
    h1.style.fontSize = '27px';
    h1.style.fontWeight = String(weight);
    values[`h1-weight-${weight}`] = rangeBox(h1);
  }
  h1.style.fontSize = '27px'; h1.style.fontWeight = '700';
  values.description = rangeBox(description);
  values.advisory = rangeBox(advisory);
  values.relatedTitle = rangeBox(relatedTitle);
  return values;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
