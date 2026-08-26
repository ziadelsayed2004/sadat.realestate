import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const files = ['figma.png', 'runtime-after.png'];
await page.setContent(files.map((file, index) => `<img id="image-${index}" src="data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}">`).join(''));
await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
const result = await page.evaluate(files => {
  const read = id => {
    const image = document.getElementById(id);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  };
  const isInk = (data, width, x, y) => {
    const i = (y * width + x) * 4;
    return data[i] < 120 && data[i + 1] < 125 && data[i + 2] < 140;
  };
  const rows = (image, region) => {
    const [x, y, width, height] = region;
    const found = [];
    for (let row = y; row < y + height; row += 1) {
      let count = 0;
      let min = image.width;
      let max = -1;
      for (let column = x; column < x + width; column += 1) {
        if (!isInk(image.data, image.width, column, row)) continue;
        count += 1;
        min = Math.min(min, column);
        max = Math.max(max, column);
      }
      if (count > 0) found.push({ y: row, min, max, count });
    }
    const groups = [];
    for (const row of found) {
      const current = groups.at(-1);
      if (current === undefined || row.y > current.at(-1).y + 1) groups.push([row]);
      else current.push(row);
    }
    return groups.map(group => ({
      y: group[0].y,
      height: group.at(-1).y - group[0].y + 1,
      min: Math.min(...group.map(row => row.min)),
      max: Math.max(...group.map(row => row.max)),
      width: Math.max(...group.map(row => row.max)) - Math.min(...group.map(row => row.min)) + 1,
      pixels: group.reduce((sum, row) => sum + row.count, 0),
    }));
  };
  const regions = {
    advisoryBody: [600, 1947, 790, 89],
    nearbyHeading: [1100, 1520, 280, 65],
    nearbyFirstTitle: [1000, 1580, 380, 70],
    relatedBody: [1000, 2311, 395, 200],
    footerTop: [100, 2670, 1300, 220],
    summaryIdentity: [900, 590, 500, 110],
    summaryPrice: [600, 590, 400, 80],
    summaryFacts: [600, 700, 800, 110],
    sidebarTitle: [170, 245, 380, 55],
    sidebarInputs: [170, 295, 380, 260],
    sidebarButtons: [170, 535, 380, 145],
    description: [600, 1000, 790, 130],
  };
  return Object.fromEntries(files.map((file, index) => {
    const image = read(`image-${index}`);
    return [file, Object.fromEntries(Object.entries(regions).map(([name, region]) => [name, rows(image, region)]))];
  }));
}, files);
console.log(JSON.stringify(result, null, 2));
await browser.close();
