import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const files = ['figma.png', 'runtime-after.png'];
await page.setContent(files.map((file, index) => `<img id="image-${index}" src="data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}">`).join(''));
await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
const result = await page.evaluate(files => {
  const read = id => {
    const image = document.getElementById(id);
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  };
  const rgb = (image, x, y) => { const i = (y * image.width + x) * 4; return [image.data[i], image.data[i + 1], image.data[i + 2]]; };
  const close = (a, b, tolerance = 3) => a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
  const runs = (image, x, predicate) => {
    const rows = [];
    for (let y = 0; y < 760; y += 1) if (predicate(rgb(image, x, y))) rows.push(y);
    const groups = [];
    for (const y of rows) { const last = groups.at(-1); if (last === undefined || y > last.at(-1) + 1) groups.push([y]); else last.push(y); }
    return groups.filter(group => group.length >= 2).map(group => ({ start: group[0], end: group.at(-1), length: group.length, sample: rgb(image, x, group[Math.floor(group.length / 2)]) }));
  };
  const transitions = image => {
    const result = [];
    for (let y = 270; y < 710; y += 1) {
      const value = rgb(image, 200, y);
      if (value[0] === 250 && value[1] === 248 && value[2] === 242) continue;
      if (value[0] === 255 && value[1] === 255 && value[2] === 255) continue;
      if (value[0] === 15 && value[1] === 74 && value[2] === 59) continue;
      if (value[0] === 23 && value[1] === 35 && value[2] === 61) continue;
      if (value[0] === 32 && value[1] === 207 && value[2] === 104) continue;
      result.push({ y, rgb: value });
    }
    const groups = [];
    for (const item of result) { const last = groups.at(-1); if (last === undefined || item.y > last.at(-1).y + 1) groups.push([item]); else last.push(item); }
    return groups.map(group => ({ start: group[0].y, end: group.at(-1).y, samples: group.slice(0, 4).map(item => item.rgb) }));
  };
  const expected = { green: [15, 74, 59], navy: [23, 35, 61], whatsapp: [32, 207, 104], white: [255, 255, 255], page: [250, 248, 242] };
  return Object.fromEntries(files.map((file, index) => {
    const image = read(`image-${index}`);
    return [file, {
      x200Green: runs(image, 200, value => close(value, expected.green, 5)),
      x200Navy: runs(image, 200, value => close(value, expected.navy, 5)),
      x200Whatsapp: runs(image, 200, value => close(value, expected.whatsapp, 5)),
      x300Surface: runs(image, 300, value => close(value, expected.white, 1)),
      x200Samples: [170, 174, 180, 220, 228, 230, 237, 239, 300, 304, 308, 340, 360, 400, 420, 440, 460, 480, 496, 540, 548, 560, 575, 600, 620, 640, 670, 690].map(y => ({ y, rgb: rgb(image, 200, y) })),
      x200Transitions: transitions(image),
    }];
  }));
}, files);
console.log(JSON.stringify(result, null, 2));
await browser.close();
