import fs from 'node:fs';
import { chromium } from '@playwright/test';

const dataUrl = file => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = await page.evaluate(async ({ expectedUrl, actualUrl }) => {
  const load = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  const [expectedImage, actualImage] = await Promise.all([load(expectedUrl), load(actualUrl)]);
  const width = expectedImage.naturalWidth;
  const height = Math.min(expectedImage.naturalHeight, actualImage.naturalHeight);
  const pixels = image => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, width, height).data;
  };
  const expected = pixels(expectedImage);
  const actual = pixels(actualImage);
  const mediaRegions = [
    { id: 'card-1', x: 799, y: 500 },
    { id: 'card-2', x: 485, y: 500 },
    { id: 'card-3', x: 171, y: 500 },
    { id: 'card-4', x: 799, y: 985 },
    { id: 'card-5', x: 485, y: 985 },
    { id: 'card-6', x: 171, y: 985 }
  ].map(region => {
    const channelMeans = data => {
      const sums = [0, 0, 0];
      let count = 0;
      for (let y = 0; y < 204; y += 1) for (let x = 0; x < 292; x += 1) {
        const index = ((region.y + y) * width + region.x + x) * 4;
        sums[0] += data[index]; sums[1] += data[index + 1]; sums[2] += data[index + 2]; count += 1;
      }
      return sums.map(sum => Number((sum / count).toFixed(1)));
    };
    let best = { dx: 0, dy: 0, meanRgbDelta: Number.POSITIVE_INFINITY, materialPercent: 100 };
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) {
      let deltaTotal = 0;
      let material = 0;
      let count = 0;
      for (let y = 0; y < 204; y += 2) for (let x = 0; x < 292; x += 2) {
        const expectedIndex = ((region.y + y) * width + region.x + x) * 4;
        const actualIndex = ((region.y + y + dy) * width + region.x + x + dx) * 4;
        const delta = Math.abs(expected[expectedIndex] - actual[actualIndex]) + Math.abs(expected[expectedIndex + 1] - actual[actualIndex + 1]) + Math.abs(expected[expectedIndex + 2] - actual[actualIndex + 2]);
        deltaTotal += delta;
        if (delta > 24) material += 1;
        count += 1;
      }
      const candidate = { dx, dy, meanRgbDelta: Number((deltaTotal / count).toFixed(2)), materialPercent: Number((material / count * 100).toFixed(2)) };
      if (candidate.meanRgbDelta < best.meanRgbDelta) best = candidate;
    }
    return { ...region, expectedMeanRgb: channelMeans(expected), actualMeanRgb: channelMeans(actual), best };
  });
  const bands = [];
  for (let start = 0; start < height; start += 100) {
    const end = Math.min(start + 100, height);
    let material = 0;
    for (let y = start; y < end; y += 1) for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const delta = Math.abs(expected[index] - actual[index]) + Math.abs(expected[index + 1] - actual[index + 1]) + Math.abs(expected[index + 2] - actual[index + 2]);
      if (delta > 24) material += 1;
    }
    bands.push({ start, end, materialPercent: Number((material / ((end - start) * width) * 100).toFixed(3)) });
  }
  const samples = [[100, 100], [100, 1000], [1200, 1000], [100, 1400], [100, 1900], [900, 650], [900, 660], ...Array.from({ length: 13 }, (_, index) => [900, 624 + index])].map(([x, y]) => {
    const index = (y * width + x) * 4;
    return { x, y, expected: [...expected.slice(index, index + 3)], actual: [...actual.slice(index, index + 3)] };
  });
  const runsAt = (data, y) => {
    const runs = [];
    let start = null;
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const foreground = Math.abs(data[index] - 250) + Math.abs(data[index + 1] - 248) + Math.abs(data[index + 2] - 242) > 15;
      if (foreground && start === null) start = x;
      if ((!foreground || x === width - 1) && start !== null) {
        const end = foreground && x === width - 1 ? x + 1 : x;
        if (end - start >= 5) runs.push([start, end]);
        start = null;
      }
    }
    return runs;
  };
  const horizontalRuns = [201, 300, 389, 444, 500, 630, 700, 850, 900, 1200, 1567, 1650].map(y => ({ y, expected: runsAt(expected, y), actual: runsAt(actual, y) }));
  const cardRows = Array.from({ length: 31 }, (_, offset) => 620 + offset).map(y => {
    const ratio = data => {
      let count = 0;
      for (let x = 799; x < 1093; x += 1) {
        const index = (y * width + x) * 4;
        if (Math.abs(data[index] - 255) + Math.abs(data[index + 1] - 255) + Math.abs(data[index + 2] - 255) > 15) count += 1;
      }
      return Number((count / 294 * 100).toFixed(1));
    };
    return { y, expectedNonWhite: ratio(expected), actualNonWhite: ratio(actual) };
  });
  const whiteRanges = data => {
    const active = [];
    for (let y = 90; y < 1500; y += 1) {
      let white = 0;
      for (let x = 150; x < 1410; x += 1) {
        const index = (y * width + x) * 4;
        if (data[index] > 252 && data[index + 1] > 252 && data[index + 2] > 252) white += 1;
      }
      if (white > 500) active.push({ y, white });
    }
    const ranges = [];
    for (const row of active) {
      const current = ranges.at(-1);
      if (!current || row.y > current.end + 1) ranges.push({ start: row.y, end: row.y, maxWhite: row.white });
      else { current.end = row.y; current.maxWhite = Math.max(current.maxWhite, row.white); }
    }
    return ranges;
  };
  return { width, height, mediaRegions, samples, bands, horizontalRuns, cardRows, whiteRanges: { expected: whiteRanges(expected), actual: whiteRanges(actual) } };
}, {
  expectedUrl: dataUrl('docs/quality/figma_parity/screens/PUB-02/figma.png'),
  actualUrl: dataUrl('docs/quality/figma_parity/screens/PUB-02/runtime-after.png')
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
