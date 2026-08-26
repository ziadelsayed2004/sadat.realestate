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
    const colors = [[15, 74, 59], [23, 35, 61], [37, 211, 102]];
    const rows = [180, 190, 200, 220, 240, 260, 580, 590, 600, 610, 640, 660, 2300, 2311, 2500, 2633, 2634];
    return Object.fromEntries(rows.map(y => {
      const runs = [];
      let start = null;
      for (let x = 0; x <= canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        const match = x < canvas.width && colors.some(([r, g, b]) => data[index] === r && data[index + 1] === g && data[index + 2] === b);
        if (match && start === null) start = x;
        if (!match && start !== null) {
          if (x - start > 5) runs.push([start, x - 1]);
          start = null;
        }
      }
      return [y, runs];
    }));
  });
  console.log(file, JSON.stringify(result));
}

await browser.close();
