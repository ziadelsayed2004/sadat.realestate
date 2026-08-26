import fs from 'node:fs';
import { chromium } from '@playwright/test';

const paths = {
  source: 'docs/quality/figma_parity/screens/PUB-03/figma.png',
  runtime: 'docs/quality/figma_parity/screens/PUB-03/runtime-after.png'
};
const images = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, `data:image/png;base64,${fs.readFileSync(value).toString('base64')}`]));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(Object.entries(images).map(([key, value]) => `<img id="${key}" src="${value}">`).join(''));
await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
const result = await page.evaluate(() => {
  const fills = { page: [250, 248, 242], surface: [255, 255, 255], footer: [23, 35, 61] };
  function getImage(id) {
    const image = document.getElementById(id);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  }
  const images = { source: getImage('source'), runtime: getImage('runtime') };
  function color(image, x, y) {
    const offset = (y * image.width + x) * 4;
    return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
  }
  function label(value, tolerance = 3) {
    for (const [key, expected] of Object.entries(fills)) {
      if (value.every((part, index) => Math.abs(part - expected[index]) <= tolerance)) return key;
    }
    return 'other';
  }
  function runs(image, x) {
    const output = [];
    let start = 0;
    let previous = label(color(image, x, 0));
    for (let y = 1; y < image.height; y += 1) {
      const current = label(color(image, x, y));
      if (current !== previous) {
        if (y - start >= 5) output.push({ start, end: y - 1, length: y - start, fill: previous });
        start = y; previous = current;
      }
    }
    if (image.height - start >= 5) output.push({ start, end: image.height - 1, length: image.height - start, fill: previous });
    return output;
  }
  return Object.fromEntries(Object.entries(images).map(([key, image]) => [key, {
    dimensions: [image.width, image.height],
    x700: runs(image, 700).filter(run => run.fill !== 'other' || run.length > 20),
    x1100: runs(image, 1100).filter(run => run.fill !== 'other' || run.length > 20),
    x1400: runs(image, 1400).filter(run => run.fill !== 'other' || run.length > 20)
  }]));
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
