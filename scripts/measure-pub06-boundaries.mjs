import fs from 'node:fs';
import { chromium } from 'playwright';

const root = 'docs/quality/figma_parity/screens/PUB-06';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const file of ['figma.png', 'runtime-after.png']) {
  const source = 'data:image/png;base64,' + fs.readFileSync(root + '/' + file).toString('base64');
  await page.setContent('<img id="image" src="' + source + '">');
  const result = await page.evaluate(() => {
    const image = document.querySelector('#image');
    if (!(image instanceof HTMLImageElement)) throw new Error('image missing');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas missing');
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const groups = [];
    let open = null;
    for (let y = 0; y < canvas.height; y += 1) {
      let best = null;
      let runStart = -1;
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        const white = data[index] > 249 && data[index + 1] > 249 && data[index + 2] > 249;
        if (white && runStart < 0) runStart = x;
        if ((!white || x === canvas.width - 1) && runStart >= 0) {
          const end = white && x === canvas.width - 1 ? x : x - 1;
          if (end - runStart + 1 > 220 && (best === null || end - runStart > best.end - best.start)) best = { start: runStart, end };
          runStart = -1;
        }
      }
      if (best === null) {
        if (open !== null) groups.push(open);
        open = null;
        continue;
      }
      if (open === null || best.start > open.start + 8 || best.end < open.end - 8) {
        if (open !== null) groups.push(open);
        open = { start: best.start, end: best.end, top: y, bottom: y };
      } else {
        open.bottom = y;
        open.start = Math.min(open.start, best.start);
        open.end = Math.max(open.end, best.end);
      }
    }
    if (open !== null) groups.push(open);
    const vertical = [600, 1000, 200].map(x => {
      const runs = [];
      let start = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        const index = (y * canvas.width + x) * 4;
        const white = data[index] > 249 && data[index + 1] > 249 && data[index + 2] > 249;
        if (white && start < 0) start = y;
        if ((!white || y === canvas.height - 1) && start >= 0) {
          const end = white && y === canvas.height - 1 ? y : y - 1;
          if (end - start > 8) runs.push({ y: start, height: end - start + 1 });
          start = -1;
        }
      }
      return { x, runs };
    });
    return { width: canvas.width, height: canvas.height, groups: groups.filter(value => value.bottom - value.top > 8).map(value => ({ x: value.start, y: value.top, width: value.end - value.start + 1, height: value.bottom - value.top + 1 })), vertical };
  });
  console.log(file, JSON.stringify(result));
}
await browser.close();
