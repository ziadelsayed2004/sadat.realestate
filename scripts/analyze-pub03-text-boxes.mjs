import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const files = ['figma.png', 'runtime-after.png'];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(files.map((file, index) => `<img id="image-${index}" src="data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}">`).join(''));
await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
const result = await page.evaluate(() => {
  function load(id) {
    const image = document.getElementById(id);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  }
  function bbox(image, x, y, width, height, predicate) {
    let minX = image.width, minY = image.height, maxX = -1, maxY = -1, count = 0;
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        const index = (row * image.width + column) * 4;
        const rgb = [image.data[index], image.data[index + 1], image.data[index + 2]];
        if (!predicate(rgb)) continue;
        count += 1;
        minX = Math.min(minX, column); minY = Math.min(minY, row);
        maxX = Math.max(maxX, column); maxY = Math.max(maxY, row);
      }
    }
    return count === 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, count };
  }
  const regions = {
    amenitiesHeading: [1150, 1170, 250, 65],
    amenitiesLabels: [600, 1230, 790, 240],
    nearbyHeading: [1150, 1520, 250, 65],
    nearbyLabels: [600, 1575, 790, 255],
    advisoryHeaderText: [800, 1878, 580, 68],
    advisoryBodyText: [600, 1947, 790, 89],
    relatedText: [1000, 2300, 405, 210],
    footerText: [100, 2670, 1300, 300]
  };
  const dark = rgb => rgb[0] < 90 && rgb[1] < 100 && rgb[2] < 115;
  return [0, 1].map(index => {
    const image = load(`image-${index}`);
    return { file: index === 0 ? 'figma.png' : 'runtime-after.png', regions: Object.fromEntries(Object.entries(regions).map(([name, [x, y, width, height]]) => [name, bbox(image, x, y, width, height, dark)])) };
  });
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
