import fs from 'node:fs';
import { chromium } from '@playwright/test';

const argumentsList = process.argv.slice(2);
const rowsArgument = argumentsList.find(value => value.startsWith('--rows='));
const [screenId, ...files] = argumentsList.filter(value => !value.startsWith('--rows='));
if (!screenId || files.length === 0) throw new Error('Usage: node scripts/inspect-image-runs.mjs SCREEN_ID FILE...');
const defaultRows = [0, 32, 60, 88, 89, 90, 120, 150, 168, 169, 170, 171, 172, 173, 174, 175, 180, 200, 220, 240, 260, 270, 280, 300, 320, 340, 350, 360, 380, 388, 389, 390, 400, 401, 402, 403, 404, 405, 406, 407, 420, 500, 560, 578, 579, 580, 600, 613, 614, 615, 640, 642, 643, 644, 650, 652, 653, 654, 680, 696, 697, 698, 720, 736, 737, 738, 740, 746, 747, 748, 780, 800, 900, 914, 915, 916, 950, 978, 979, 980, 1029, 1030, 1031, 1040, 1084, 1085, 1086, 1087, 1088, 1100, 1200, 1248, 1249, 1250, 1260, 1300, 1343, 1344, 1345, 1346, 1368, 1369, 1370, 1500, 1600, 1700];
const rows = (rowsArgument ? rowsArgument.slice('--rows='.length).split(',').map(Number) : defaultRows).filter((value, index, list) => Number.isFinite(value) && list.indexOf(value) === index);
const root = process.cwd();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const file of files) {
  const source = `data:image/png;base64,${fs.readFileSync(`${root}/docs/quality/figma_parity/screens/${screenId}/${file}`).toString('base64')}`;
  await page.setContent(`<img id="image" src="${source}">`);
  const output = await page.evaluate(({ rows }) => {
    const image = document.querySelector('#image');
    if (!(image instanceof HTMLImageElement)) throw new Error('image missing');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas missing');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixel = (x, y) => {
      const i = (y * canvas.width + x) * 4;
      return [pixels[i], pixels[i + 1], pixels[i + 2]];
    };
    const names = {
      page: (r, g, b) => Math.abs(r - 250) <= 2 && Math.abs(g - 248) <= 2 && Math.abs(b - 242) <= 2,
      white: (r, g, b) => r >= 254 && g >= 254 && b >= 254,
      header: (r, g, b) => r >= 254 && g >= 254 && b >= 253,
      navy: (r, g, b) => r === 23 && g === 35 && b === 61,
      border: (r, g, b) => r === 229 && g === 229 && b === 229,
      tanBorder: (r, g, b) => r === 232 && g === 225 && b === 210,
      gold: (r, g, b) => r === 209 && g === 160 && b === 68
    };
    const intervals = (y, predicate) => {
      if (y >= canvas.height) return [];
      const result = [];
      let start = -1;
      for (let x = 0; x < canvas.width; x += 1) {
        const match = predicate(...pixel(x, y));
        if (match && start < 0) start = x;
        if ((!match || x === canvas.width - 1) && start >= 0) {
          const end = match && x === canvas.width - 1 ? x : x - 1;
          if (end - start + 1 >= 8) result.push({ x: start, width: end - start + 1 });
          start = -1;
        }
      }
      return result;
    };
    const compact = {};
    for (const y of rows) {
      compact[y] = Object.fromEntries(Object.entries(names).map(([name, predicate]) => [name, intervals(y, predicate)]).filter(([, value]) => value.length > 0));
    }
    return { width: canvas.width, height: canvas.height, runs: compact };
  }, { rows });
  console.log(file, JSON.stringify(output));
}
await browser.close();
