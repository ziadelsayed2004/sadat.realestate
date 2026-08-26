import fs from 'node:fs';
import { chromium } from 'playwright';

const root = 'docs/quality/figma_parity/screens/PUB-06';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const source = 'data:image/png;base64,' + fs.readFileSync(root + '/figma.png').toString('base64');
const runtime = 'data:image/png;base64,' + fs.readFileSync(root + '/runtime-after.png').toString('base64');
await page.setContent('<img id="source" src="' + source + '"><img id="runtime" src="' + runtime + '">');
const result = await page.evaluate(() => {
  const load = id => {
    const image = document.querySelector(id);
    if (!(image instanceof HTMLImageElement)) throw new Error('image missing');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas missing');
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  };
  const left = load('#source');
  const right = load('#runtime');
  const regions = {
    header: [0, 0, 1534, 90],
    hero: [0, 90, 1534, 288],
    identity: [0, 378, 1534, 206],
    overview: [570, 660, 814, 500],
    sidebar: [145, 660, 400, 850],
    projects: [570, 1160, 814, 540],
    properties: [570, 1710, 814, 220],
    contact: [570, 1940, 814, 580],
    footer: [0, 2571, 1534, 414]
  };
  const output = {};
  for (const [name, [x, y, width, height]] of Object.entries(regions)) {
    let material = 0;
    let antiAliasing = 0;
    let sum = 0;
    let count = 0;
    for (let yy = y; yy < Math.min(y + height, left.height, right.height); yy += 1) {
      for (let xx = x; xx < Math.min(x + width, left.width, right.width); xx += 1) {
        const index = (yy * left.width + xx) * 4;
        const delta = Math.abs(left.data[index] - right.data[index]) + Math.abs(left.data[index + 1] - right.data[index + 1]) + Math.abs(left.data[index + 2] - right.data[index + 2]);
        if (delta > 24) material += 1;
        else if (delta > 3) antiAliasing += 1;
        sum += delta;
        count += 1;
      }
    }
    output[name] = { materialPercent: Number((material / count * 100).toFixed(3)), antiAliasingPercent: Number((antiAliasing / count * 100).toFixed(3)), meanRgbDelta: Number((sum / count).toFixed(2)) };
  }
  return output;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
