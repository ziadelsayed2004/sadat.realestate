import fs from 'node:fs';
import { chromium } from 'playwright';

const root = 'apps/web/public/assets/clone';
const sourcePath = 'docs/quality/figma_parity/screens/PUB-06/figma.png';
const candidates = fs.readdirSync(root).filter(file => file.endsWith('.png')).sort();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = await page.evaluate(async ({ source, candidates }) => {
  const load = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  const targetImage = await load(source);
  const target = document.createElement('canvas');
  target.width = 1534;
  target.height = 288;
  target.getContext('2d').drawImage(targetImage, 0, 90, 1534, 288, 0, 0, 1534, 288);
  const expected = target.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 1534, 288).data;
  const output = [];
  for (const candidate of candidates) {
    const image = await load(candidate.src);
    const canvas = document.createElement('canvas');
    canvas.width = 1534;
    canvas.height = 288;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const scale = Math.max(1534 / image.naturalWidth, 288 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (1534 - width) / 2, (288 - height) / 2, width, height);
    const actual = context.getImageData(0, 0, 1534, 288).data;
    let sum = 0;
    let material = 0;
    for (let i = 0; i < expected.length; i += 4) {
      const delta = Math.abs(expected[i] - actual[i]) + Math.abs(expected[i + 1] - actual[i + 1]) + Math.abs(expected[i + 2] - actual[i + 2]);
      sum += delta;
      if (delta > 24) material += 1;
    }
    output.push({ candidate: candidate.name, meanRgbDelta: Number((sum / (1534 * 288)).toFixed(2)), materialPercent: Number((material / (1534 * 288) * 100).toFixed(2)) });
  }
  return output.sort((a, b) => a.meanRgbDelta - b.meanRgbDelta);
}, { source: 'data:image/png;base64,' + fs.readFileSync(sourcePath).toString('base64'), candidates: candidates.map(name => ({ name, src: 'data:image/png;base64,' + fs.readFileSync(root + '/' + name).toString('base64') })) });
console.log(JSON.stringify(result, null, 2));
await browser.close();
