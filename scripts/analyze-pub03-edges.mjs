import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const source = 'data:image/png;base64,' + fs.readFileSync(root + '/figma.png').toString('base64');
const runtime = 'data:image/png;base64,' + fs.readFileSync(root + '/runtime-after.png').toString('base64');
await page.setContent('<img id="source" src="' + source + '"><img id="runtime" src="' + runtime + '">');
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
  const images = { source: read('source'), runtime: read('runtime') };
  const pixel = (image, x, y) => {
    const offset = (y * image.width + x) * 4;
    return [...image.data.slice(offset, offset + 3)];
  };
  const rowAverage = (image, y, x1, x2) => {
    let value = 0;
    for (let x = x1; x < x2; x += 1) {
      const color = pixel(image, x, y);
      value += color[0] + color[1] + color[2];
    }
    return value / ((x2 - x1) * 3);
  };
  const runs = (image, y, x1, x2, predicate) => {
    const output = [];
    let start = null;
    for (let x = x1; x <= x2; x += 1) {
      const matches = x < x2 && predicate(pixel(image, x, y));
      if (matches && start === null) start = x;
      if (!matches && start !== null) {
        if (x - start >= 2) output.push([start, x - 1]);
        start = null;
      }
    }
    return output;
  };
  const edgeRows = (image, x1, x2, y1, y2) => {
    const rows = [];
    for (let y = y1; y < y2; y += 1) rows.push({ y, average: rowAverage(image, y, x1, x2) });
    return rows.sort((left, right) => right.average - left.average).slice(0, 12);
  };
  const whiteRowSpans = (image, x1, x2, y1, y2) => {
    const spans = [];
    let start = null;
    for (let y = y1; y <= y2; y += 1) {
      const matches = y < y2 && rowAverage(image, y, x1, x2) > 251.5;
      if (matches && start === null) start = y;
      if (!matches && start !== null) {
        if (y - start >= 4) spans.push([start, y - 1]);
        start = null;
      }
    }
    return spans;
  };
  const sourceCardRuns = [];
  const runtimeCardRuns = [];
  for (const y of [2090, 2095, 2100, 2102, 2104, 2106, 2110, 2300, 2500]) {
    sourceCardRuns.push({ y, runs: runs(images.source, y, 900, 1500, color => color[0] > 248 && color[1] > 248 && color[2] > 248) });
    runtimeCardRuns.push({ y, runs: runs(images.runtime, y, 900, 1500, color => color[0] > 248 && color[1] > 248 && color[2] > 248) });
  }
  const verticalSamples = (image, x) => [2050, 2060, 2070, 2080, 2090, 2100, 2110, 2120, 2130, 2140, 2300, 2310, 2320, 2330, 2400, 2500, 2510, 2520].map(y => ({ y, color: pixel(image, x, y) }));
  const firstWhiteRun = (image, x, y1, y2) => {
    for (let y = y1; y < y2; y += 1) {
      if (pixel(image, x, y).every(value => value === 255) && pixel(image, x, y + 1).every(value => value === 255) && pixel(image, x, y + 2).every(value => value === 255)) return y;
    }
    return null;
  };
  return {
    samples: {
      sourcePage: pixel(images.source, 100, 100),
      runtimePage: pixel(images.runtime, 100, 100),
      sourceCard: pixel(images.source, 1200, 2200),
      runtimeCard: pixel(images.runtime, 1200, 2200)
    },
    relatedRows: {
      source: edgeRows(images.source, 900, 1500, 2040, 2600),
      runtime: edgeRows(images.runtime, 900, 1500, 2040, 2600)
    },
    sourceCardRuns,
    runtimeCardRuns
    ,
    verticalSamples: {
      source: verticalSamples(images.source, 1200),
      runtime: verticalSamples(images.runtime, 1200)
    },
    firstWhiteRun: {
      source: firstWhiteRun(images.source, 1200, 2200, 2400),
      runtime: firstWhiteRun(images.runtime, 1200, 2200, 2400)
    },
    whiteRowSpans: {
      source: whiteRowSpans(images.source, 620, 1380, 1000, 2700),
      runtime: whiteRowSpans(images.runtime, 620, 1380, 1000, 2700)
    }
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
