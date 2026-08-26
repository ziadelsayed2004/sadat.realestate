import fs from 'node:fs';
import { chromium } from '@playwright/test';

const state = JSON.parse(fs.readFileSync('docs/quality/figma_parity/screens/PUB-03/deterministic-state.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 720 } });
await page.route('**/api/v1/public/properties/published-home**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.response) }));
await page.goto('http://127.0.0.1:4173/properties/published-home?lang=ar', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const result = await page.evaluate(() => {
  const paragraph = document.querySelector('.public-property-details__advisory p');
  if (!(paragraph instanceof HTMLElement)) throw new Error('advisory paragraph not found');
  const text = paragraph.firstChild;
  if (!(text instanceof Text)) throw new Error('advisory text not found');
  const measure = (fontSize, lineHeight, paddingTop = 20) => {
    paragraph.style.fontSize = `${fontSize}px`;
    paragraph.style.lineHeight = `${lineHeight}px`;
    paragraph.style.paddingTop = `${paddingTop}px`;
    const groups = new Map();
    for (let index = 0; index < text.length; index += 1) {
      const range = document.createRange();
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const rect = range.getBoundingClientRect();
      const key = Math.round(rect.top * 10) / 10;
      const group = groups.get(key) ?? { text: '', left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      group.text += text.data[index];
      group.left = Math.min(group.left, rect.left);
      group.right = Math.max(group.right, rect.right);
      group.bottom = Math.max(group.bottom, rect.bottom);
      groups.set(key, group);
    }
    return { fontSize, lineHeight, paddingTop, contentWidth: paragraph.clientWidth - parseFloat(getComputedStyle(paragraph).paddingLeft) - parseFloat(getComputedStyle(paragraph).paddingRight), lines: [...groups.values()].map(line => ({ text: line.text, left: line.left, right: line.right, width: line.right - line.left, top: line.top, height: line.bottom - line.top })) };
  };
  return [
    measure(13, 18, 20), measure(14, 21, 18), measure(14, 24, 18), measure(14, 24, 20), measure(15, 22, 18), measure(16, 24, 18), measure(16, 24, 20),
  ];
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
