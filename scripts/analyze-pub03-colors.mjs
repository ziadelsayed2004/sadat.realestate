import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const files = ['figma.png', 'runtime-after.png'];
await page.setContent(files.map((file, index) => `<img id="image-${index}" src="data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}">`).join(''));
await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
const result = await page.evaluate(() => {
  function load(id) {
    const image = document.getElementById(id);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return { width: canvas.width, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  }
  function rgb(image, x, y) {
    const index = (y * image.width + x) * 4;
    return [image.data[index], image.data[index + 1], image.data[index + 2]];
  }
  function exactRuns(image, y, expected, minimum = 3) {
    const runs = [];
    let start = null;
    for (let x = 0; x < image.width; x += 1) {
      const match = rgb(image, x, y).every((value, index) => value === expected[index]);
      if (match && start === null) start = x;
      if (!match && start !== null) {
        if (x - start >= minimum) runs.push([start, x - 1]);
        start = null;
      }
    }
    if (start !== null) runs.push([start, image.width - 1]);
    return runs;
  }
  function topColors(image, x, y, width, height, limit = 8) {
    const counts = new Map();
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        const key = rgb(image, column, row).join(',');
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([color, count]) => ({ color, count }));
  }
  function verticalRuns(image, x, start, end) {
    const runs = [];
    let runStart = start;
    let previous = rgb(image, x, start).join(',');
    for (let row = start + 1; row <= end; row += 1) {
      const current = rgb(image, x, row).join(',');
      if (current === previous) continue;
      if (row - runStart >= 5) runs.push({ start: runStart, end: row - 1, color: previous });
      runStart = row;
      previous = current;
    }
    if (end + 1 - runStart >= 5) runs.push({ start: runStart, end, color: previous });
    return runs;
  }
  const images = [load('image-0'), load('image-1')];
  const rows = [1231, 1232, 1255, 1291, 1351, 1411, 1515, 1584, 1600, 1668, 1752, 1878, 1879, 1947, 2036, 2060, 2102, 2103, 2311, 2511, 2520, 2632, 2633];
  const regions = {
    card: [594, 1162, 811, 330],
    amenityIcon: [1343, 1243, 24, 24],
    nearbyIcon: [1343, 1608, 24, 24],
    chip: [1198, 1231, 181, 48]
  };
  return images.map((image, index) => ({
    file: index === 0 ? 'figma.png' : 'runtime-after.png',
    rows: Object.fromEntries(rows.map(row => [row, {
      white: exactRuns(image, row, [255, 255, 255], 20),
      page: exactRuns(image, row, [250, 248, 242], 20),
      neutralBorder: exactRuns(image, row, [236, 235, 232], 3),
      beigeBorder: exactRuns(image, row, [232, 225, 210], 3)
    }])),
    regions: Object.fromEntries(Object.entries(regions).map(([name, [x, y, width, height]]) => [name, topColors(image, x, y, width, height)]))
    ,vertical: Object.fromEntries([650, 700, 1100].map(x => [x, verticalRuns(image, x, 1500, 2050)]))
  }));
});
console.log(JSON.stringify(result.map(item => ({ file: item.file, vertical: item.vertical })), null, 2));
await browser.close();
