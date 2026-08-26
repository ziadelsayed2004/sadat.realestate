import fs from 'node:fs';
import { chromium } from '@playwright/test';

const files = {
  source: 'docs/quality/figma_parity/screens/PUB-03/figma.png',
  runtime: 'docs/quality/figma_parity/screens/PUB-03/runtime-after.png'
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(Object.entries(files).map(([key, file]) => `<img id="${key}" src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}">`).join(''));
await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
const result = await page.evaluate(() => {
  function image(id) {
    const element = document.getElementById(id);
    const canvas = document.createElement('canvas'); canvas.width = element.naturalWidth; canvas.height = element.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(element, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  }
  const images = { source: image('source'), runtime: image('runtime') };
  function rgb(item, x, y) { const offset = (y * item.width + x) * 4; return [item.data[offset], item.data[offset + 1], item.data[offset + 2]]; }
  function isPage(value) { return value[0] >= 247 && value[0] <= 251 && value[1] >= 245 && value[1] <= 249 && value[2] >= 239 && value[2] <= 244; }
  function isSurface(value) { return value.every(channel => channel >= 252); }
  function isFooter(value) { return value[0] <= 28 && value[1] <= 40 && value[2] <= 66; }
  function label(value) { return isPage(value) ? 'page' : isSurface(value) ? 'surface' : isFooter(value) ? 'footer' : 'other'; }
  function runs(item, x) {
    const output = []; let start = 0; let previous = label(rgb(item, x, 0));
    for (let y = 1; y < item.height; y += 1) { const current = label(rgb(item, x, y)); if (current !== previous) { if (y - start >= 8) output.push({ start, end: y - 1, length: y - start, fill: previous }); start = y; previous = current; } }
    if (item.height - start >= 8) output.push({ start, end: item.height - 1, length: item.height - start, fill: previous });
    return output;
  }
  return Object.fromEntries(Object.entries(images).map(([key, item]) => [key, {
    dimensions: [item.width, item.height],
    x200: runs(item, 200),
    x300: runs(item, 300),
    samples: Array.from({ length: Math.floor(Math.min(item.height, 760) / 10) }, (_, index) => {
      const y = index * 10;
      return { y, rgb: rgb(item, 200, y), fill: label(rgb(item, 200, y)) };
    }).filter(sample => sample.y >= 150)
  }]));
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
