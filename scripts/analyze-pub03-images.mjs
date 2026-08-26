import fs from 'node:fs';
import { chromium } from '@playwright/test';

const sourcePath = 'docs/quality/figma_parity/screens/PUB-03/figma.png';
const runtimePath = 'docs/quality/figma_parity/screens/PUB-03/runtime-after.png';
const source = `data:image/png;base64,${fs.readFileSync(sourcePath).toString('base64')}`;
const runtime = `data:image/png;base64,${fs.readFileSync(runtimePath).toString('base64')}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(`<img id="source" src="${source}"><img id="runtime" src="${runtime}">`);
await page.evaluate(async () => {
  await Promise.all([...document.images].map(image => image.decode()));
});

const result = await page.evaluate(() => {
  function pixels(id) {
    const image = document.getElementById(id);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  }
  const images = { source: pixels('source'), runtime: pixels('runtime') };
  function rgb(image, x, y) {
    const index = (Math.max(0, Math.min(image.height - 1, y)) * image.width + Math.max(0, Math.min(image.width - 1, x))) * 4;
    return [...image.data.slice(index, index + 3)];
  }
  function mean(image, x0, x1, y) {
    const result = [0, 0, 0];
    const start = Math.max(0, Math.floor(x0));
    const end = Math.min(image.width, Math.ceil(x1));
    for (let x = start; x < end; x += 1) {
      const value = rgb(image, x, y);
      result[0] += value[0]; result[1] += value[1]; result[2] += value[2];
    }
    const count = Math.max(1, end - start);
    return result.map(value => Math.round(value / count));
  }
  function runs(image, x, tolerance = 4) {
    const output = [];
    let start = 0;
    let previous = rgb(image, x, 0);
    for (let y = 1; y < image.height; y += 1) {
      const current = rgb(image, x, y);
      const changed = current.some((value, index) => Math.abs(value - previous[index]) > tolerance);
      if (changed) {
        if (y - start >= 3) output.push({ start, end: y - 1, length: y - start, color: previous });
        start = y;
        previous = current;
      }
    }
    if (image.height - start >= 3) output.push({ start, end: image.height - 1, length: image.height - start, color: previous });
    return output.filter(run => run.length >= 6);
  }
  function rowChanges(image, x0, x1, tolerance = 8) {
    const output = [];
    let previous = mean(image, x0, x1, 0);
    let start = 0;
    for (let y = 1; y < image.height; y += 1) {
      const current = mean(image, x0, x1, y);
      const changed = current.some((value, index) => Math.abs(value - previous[index]) > tolerance);
      if (changed) {
        if (y - start >= 3) output.push({ start, end: y - 1, length: y - start, color: previous });
        start = y;
        previous = current;
      }
    }
    if (image.height - start >= 3) output.push({ start, end: image.height - 1, length: image.height - start, color: previous });
    return output.filter(run => run.length >= 6);
  }
  return {
    dimensions: Object.fromEntries(Object.entries(images).map(([key, image]) => [key, { width: image.width, height: image.height }])),
    samples: Object.fromEntries(Object.entries(images).map(([key, image]) => [key, {
      page: rgb(image, 10, 100),
      main: rgb(image, 700, 700),
      card: rgb(image, 700, 900),
      footer: rgb(image, 700, image.height - 50),
      rowMain: mean(image, 595, Math.min(image.width, 1406), 700)
    }])),
    verticalAtMain: Object.fromEntries(Object.entries(images).map(([key, image]) => [key, runs(image, Math.min(700, image.width - 1))])),
    verticalAtRight: Object.fromEntries(Object.entries(images).map(([key, image]) => [key, runs(image, Math.min(1000, image.width - 1))])),
    rowRunsMain: Object.fromEntries(Object.entries(images).map(([key, image]) => [key, rowChanges(image, 595, Math.min(image.width, 1406))]))
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
