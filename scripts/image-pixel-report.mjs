import fs from 'node:fs';
import { chromium } from '@playwright/test';

const [screenId, ...names] = process.argv.slice(2);
if (!screenId || names.length === 0) throw new Error('Usage: node scripts/image-pixel-report.mjs SCREEN_ID FILE...');
const root = process.cwd();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = {};
for (const name of names) {
  const path = `${root}/docs/quality/figma_parity/screens/${screenId}/${name}`;
  const dataUrl = `data:image/png;base64,${fs.readFileSync(path).toString('base64')}`;
  result[name] = await page.evaluate(async ({ dataUrl }) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('2d context unavailable');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Map();
    for (let index = 0; index < pixels.length; index += 4) {
      const key = `${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`;
      colors.set(key, (colors.get(key) ?? 0) + 1);
    }
    const common = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([color, count]) => ({ color, count }));
    const requestedColors = ['255,255,254', '255,255,255', '250,248,242', '232,225,210', '229,229,229', '237,238,239', '237,238,240', '243,232,208', '254,243,198', '253,236,206', '23,35,61', '15,74,59', '209,160,68'];
    const selected = Object.fromEntries(requestedColors.map(color => [color, colors.get(color) ?? 0]));
    const samplePoints = [
      [0, 0], [10, 88], [10, 89], [10, 90],
      [10, 1084], [10, 1085], [10, 1086], [10, 1368], [10, 1369],
      [760, 90], [760, 400], [760, 1085], [760, 1369], [760, 1750],
      [141, 500], [142, 500], [143, 500], [144, 500], [145, 500], [146, 500],
      [547, 500], [548, 500], [549, 500], [550, 500], [551, 500], [552, 500],
      [405, 402], [405, 403], [405, 404], [405, 577], [405, 578], [405, 579]
    ].filter(([x, y]) => x < canvas.width && y < canvas.height).map(([x, y]) => ({ x, y, color: [...pixels.slice((y * canvas.width + x) * 4, (y * canvas.width + x + 1) * 4)] }));
    const rangeSamples = [500, 600, 650, 900].filter(y => y < canvas.height).map(y => ({
      y,
      pixels: Array.from({ length: 24 }, (_, index) => {
        const x = 134 + index;
        const i = (y * canvas.width + x) * 4;
        return { x, color: [...pixels.slice(i, i + 4)] };
      })
    }));
    const verticalSamples = [1345, 1200, 760].map(x => ({
      x,
      pixels: Array.from({ length: 100 }, (_, index) => {
        const y = 300 + index;
        const i = (y * canvas.width + x) * 4;
        return { y, color: [...pixels.slice(i, i + 4)] };
      })
    }));
    const regions = [
      { name: 'intro-to-grid', x: 900, y: 320, width: 500, height: 82 },
      { name: 'header', x: 0, y: 0, width: canvas.width, height: Math.min(90, canvas.height) },
      { name: 'first-grid-row', x: 0, y: 390, width: canvas.width, height: Math.min(330, Math.max(0, canvas.height - 390)) }
    ].map(region => {
      const xEnd = Math.min(canvas.width, region.x + region.width);
      const yEnd = Math.min(canvas.height, region.y + region.height);
      let dark = 0;
      let colored = 0;
      let minX = canvas.width; let minY = canvas.height; let maxX = -1; let maxY = -1;
      for (let y = region.y; y < yEnd; y += 1) for (let x = region.x; x < xEnd; x += 1) {
        const i = (y * canvas.width + x) * 4;
        const r = pixels[i]; const g = pixels[i + 1]; const b = pixels[i + 2];
        if (r < 100 && g < 110 && b < 130) { dark += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        if (Math.max(r, g, b) - Math.min(r, g, b) > 35) colored += 1;
      }
      return { name: region.name, pixels: (xEnd - region.x) * (yEnd - region.y), dark, colored, darkBounds: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
    });
    const colorBounds = ['23,35,61', '15,74,59', '209,160,68', '232,225,210', '229,229,229'].map(color => {
      const expected = color.split(',').map(Number);
      let count = 0; let minX = canvas.width; let minY = canvas.height; let maxX = -1; let maxY = -1;
      for (let y = 90; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] === expected[0] && pixels[i + 1] === expected[1] && pixels[i + 2] === expected[2]) { count += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
      }
      return { color, count, bounds: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
    });
    return { width: canvas.width, height: canvas.height, common, selected, samplePoints, rangeSamples, verticalSamples, regions, colorBounds };
  }, { dataUrl });
}
console.log(JSON.stringify(result, null, 2));
await browser.close();
