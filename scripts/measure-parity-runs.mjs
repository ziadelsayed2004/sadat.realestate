import fs from 'node:fs';
import { chromium } from 'playwright';

const [screenId, ...files] = process.argv.slice(2);
if (!screenId || files.length === 0) throw new Error('Usage: node scripts/measure-parity-runs.mjs SCREEN_ID FILE...');
const root = `docs/quality/figma_parity/screens/${screenId}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const file of files) {
  const source = `data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}`;
  await page.setContent(`<img id="image" src="${source}">`);
  const result = await page.evaluate(() => {
    const image = document.querySelector('#image');
    if (!(image instanceof HTMLImageElement)) throw new Error('image missing');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas missing');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const sample = (x, y) => {
      const index = (y * canvas.width + x) * 4;
      return [pixels[index], pixels[index + 1], pixels[index + 2]];
    };
    const rowRuns = (predicate, minimum = 8) => {
      const runs = [];
      let start = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        let matching = 0;
        for (let x = 0; x < canvas.width; x += 8) if (predicate(...sample(x, y))) matching += 1;
        const isRun = matching > canvas.width / 16;
        if (isRun && start < 0) start = y;
        if ((!isRun || y === canvas.height - 1) && start >= 0) {
          const end = isRun && y === canvas.height - 1 ? y : y - 1;
          if (end - start + 1 >= minimum) runs.push({ y: start, height: end - start + 1 });
          start = -1;
        }
      }
      return runs;
    };
    const verticalRuns = (x, predicate, minimum = 8) => {
      const runs = [];
      let start = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        const isRun = predicate(...sample(Math.min(x, canvas.width - 1), y));
        if (isRun && start < 0) start = y;
        if ((!isRun || y === canvas.height - 1) && start >= 0) {
          const end = isRun && y === canvas.height - 1 ? y : y - 1;
          if (end - start + 1 >= minimum) runs.push({ y: start, height: end - start + 1 });
          start = -1;
        }
      }
      return runs;
    };
    const nearPage = (r, g, b) => Math.abs(r - 250) < 4 && Math.abs(g - 248) < 4 && Math.abs(b - 242) < 4;
    const nearWhite = (r, g, b) => r > 249 && g > 249 && b > 249;
    return {
      width: canvas.width,
      height: canvas.height,
      samples: { top: sample(Math.floor(canvas.width / 2), 0), page: sample(2, Math.min(100, canvas.height - 1)), bottom: sample(Math.floor(canvas.width / 2), canvas.height - 1) },
      navy: rowRuns((r, g, b) => b > 35 && b < 90 && r < 60 && g < 70, 12),
      white: rowRuns((r, g, b) => r > 249 && g > 249 && b > 249, 12),
      page: rowRuns((r, g, b) => r > 245 && g > 243 && b > 235, 12),
      verticalAtX: [150, 200, 300, 400, 550, 600, 800, 1000, 1200, 1360].map(x => ({ x, nonPage: verticalRuns(x, (r, g, b) => !nearPage(r, g, b), 12), white: verticalRuns(x, nearWhite, 12) }))
    };
  });
  console.log(file, JSON.stringify(result));
}
await browser.close();
