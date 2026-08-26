import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 3200 } });
for (const file of ['figma.png', 'runtime-after.png']) {
  await page.setContent(`<img id="image" src="data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}">`);
  const result = await page.evaluate(() => {
    const image = document.querySelector('#image');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const bbox = (region, predicate) => {
      const [x, y, width, height] = region;
      let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1, count = 0;
      for (let yy = y; yy < y + height; yy += 1) for (let xx = x; xx < x + width; xx += 1) {
        const i = (yy * canvas.width + xx) * 4;
        if (!predicate(data[i], data[i + 1], data[i + 2])) continue;
        minX = Math.min(minX, xx); minY = Math.min(minY, yy); maxX = Math.max(maxX, xx); maxY = Math.max(maxY, yy); count += 1;
      }
      return count ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, count } : null;
    };
    const gold = (r, g, b) => r > 150 && r > g * 1.15 && g > b * 1.2 && b < 150;
    const navy = (r, g, b) => r < 80 && g < 90 && b < 110;
    return {
      summaryPrice: bbox([600, 580, 400, 90], gold),
      relatedPrice: bbox([1000, 2330, 405, 70], gold),
      summaryTitle: bbox([1000, 600, 400, 90], navy),
      sidebarTitle: bbox([180, 245, 370, 60], navy),
      headerLogo: bbox([1250, 0, 200, 100], (r, g, b) => (g > r * 1.1 && g > b * 0.9) || (r > 120 && r > g * 1.15 && r > b * 1.3)),
    };
  });
  console.log(file, JSON.stringify(result));
}
await browser.close();
