import fs from 'node:fs';
import { chromium } from '@playwright/test';

const state = JSON.parse(fs.readFileSync('docs/quality/figma_parity/screens/PUB-03/deterministic-state.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 720 } });
await page.route('**/api/v1/public/properties/published-home**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.response) }));
await page.goto('http://127.0.0.1:4173/properties/published-home?lang=ar', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
console.log(JSON.stringify(await page.evaluate(() => {
  const paragraph = document.querySelector('.public-property-details__description p');
  const text = paragraph?.firstChild;
  if (!(paragraph instanceof HTMLElement) || !(text instanceof Text)) throw new Error('description text not found');
  const measure = (fontSize, lineHeight) => {
    paragraph.style.fontSize = `${fontSize}px`;
    paragraph.style.lineHeight = `${lineHeight}px`;
    const groups = new Map();
    for (let index = 0; index < text.length; index += 1) {
      const range = document.createRange(); range.setStart(text, index); range.setEnd(text, index + 1);
      const rect = range.getBoundingClientRect(); const key = Math.round(rect.top * 10) / 10;
      const line = groups.get(key) ?? { text: '', left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      line.text += text.data[index]; line.left = Math.min(line.left, rect.left); line.right = Math.max(line.right, rect.right); line.bottom = Math.max(line.bottom, rect.bottom); groups.set(key, line);
    }
    return { fontSize, lineHeight, width: paragraph.clientWidth, lines: [...groups.values()].map(line => ({ text: line.text, left: line.left, right: line.right, width: line.right - line.left, top: line.top, height: line.bottom - line.top })) };
  };
  return [measure(14, 24), measure(15, 24), measure(16, 24), measure(16, 28), measure(17, 28)];
}), null, 2));
await browser.close();
