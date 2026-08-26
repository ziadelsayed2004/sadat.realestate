import { chromium } from '@playwright/test';
import fs from 'node:fs';
const state = JSON.parse(fs.readFileSync('docs/quality/figma_parity/screens/PUB-03/deterministic-state.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1577, height: 720 } });
await p.route('**/api/v1/public/properties/published-home**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.response) }));
await p.goto('http://127.0.0.1:4173/properties/published-home?lang=ar', { waitUntil: 'networkidle' });
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => undefined))); });
const result = await p.evaluate(() => {
  const describe = element => { const r = element.getBoundingClientRect(); const s = getComputedStyle(element); return { text: element.textContent?.trim(), className: element.className, x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,padding:s.padding,margin:s.margin,gap:s.gap }; };
  const header = document.querySelector('.public-homepage__header');
  return { header: describe(header), children: [...header.children].map(child => ({ ...describe(child), children: [...child.querySelectorAll(':scope > *, :scope > img')].map(describe) })) };
});
console.log(JSON.stringify(result, null, 2));
await b.close();
