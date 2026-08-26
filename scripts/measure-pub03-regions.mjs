import fs from 'node:fs';
import { chromium } from '@playwright/test';

const sourcePath = 'docs/quality/figma_parity/screens/PUB-03/figma.png';
const runtimePath = 'docs/quality/figma_parity/screens/PUB-03/runtime-after.png';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const source = `data:image/png;base64,${fs.readFileSync(sourcePath).toString('base64')}`;
const runtime = `data:image/png;base64,${fs.readFileSync(runtimePath).toString('base64')}`;
await page.setContent(`<img id="source" src="${source}"><img id="runtime" src="${runtime}">`);
await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
const result = await page.evaluate(() => {
  const read = id => {
    const image = document.getElementById(id);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  };
  const source = read('source');
  const runtime = read('runtime');
  const regions = {
    header: [0, 0, 1577, 90],
    gallery: [595, 174, 811, 384],
    summary: [595, 581, 811, 260],
    source: [595, 864, 811, 106],
    description: [595, 993, 811, 146],
    amenities: [595, 1162, 811, 330],
    nearby: [595, 1515, 811, 340],
    advisory: [595, 1878, 811, 159],
    related: [595, 2060, 811, 452],
    sidebar: [171, 174, 390, 519],
    footer: [0, 2632, 1577, 414]
  };
  function score(region) {
    const [x, y, width, height] = region;
    let material = 0;
    let antialias = 0;
    let totalDelta = 0;
    let count = 0;
    for (let row = y; row < Math.min(y + height, source.height, runtime.height); row += 1) {
      for (let column = x; column < Math.min(x + width, source.width, runtime.width); column += 1) {
        const index = (row * source.width + column) * 4;
        const delta = Math.abs(source.data[index] - runtime.data[index]) + Math.abs(source.data[index + 1] - runtime.data[index + 1]) + Math.abs(source.data[index + 2] - runtime.data[index + 2]);
        totalDelta += delta;
        if (delta > 24) material += 1;
        else if (delta > 3) antialias += 1;
        count += 1;
      }
    }
    return { materialPercent: Number((material / count * 100).toFixed(3)), antiAliasingPercent: Number((antialias / count * 100).toFixed(3)), meanRgbSumDelta: Number((totalDelta / count).toFixed(3)), pixels: count };
  }
  function shiftedScore(region, dx, dy) {
    const [x, y, width, height] = region;
    let total = 0;
    let count = 0;
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        const sourceIndex = (row * source.width + column) * 4;
        const runtimeColumn = column + dx;
        const runtimeRow = row + dy;
        if (runtimeColumn < 0 || runtimeRow < 0 || runtimeColumn >= runtime.width || runtimeRow >= runtime.height) continue;
        const runtimeIndex = (runtimeRow * runtime.width + runtimeColumn) * 4;
        total += Math.abs(source.data[sourceIndex] - runtime.data[runtimeIndex]) + Math.abs(source.data[sourceIndex + 1] - runtime.data[runtimeIndex + 1]) + Math.abs(source.data[sourceIndex + 2] - runtime.data[runtimeIndex + 2]);
        count += 1;
      }
    }
    return { dx, dy, meanRgbSumDelta: Number((total / count).toFixed(3)) };
  }
  const shifts = Object.fromEntries(Object.entries(regions).map(([name, region]) => [name, [-1, 0, 1].flatMap(dx => [-1, 0, 1].map(dy => shiftedScore(region, dx, dy))).sort((left, right) => left.meanRgbSumDelta - right.meanRgbSumDelta).slice(0, 3)]));
  return { dimensions: { source: [source.width, source.height], runtime: [runtime.width, runtime.height] }, regions: Object.fromEntries(Object.entries(regions).map(([name, region]) => [name, score(region)])), bestShifts: shifts };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
