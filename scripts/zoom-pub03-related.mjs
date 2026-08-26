import fs from 'node:fs';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2000, height: 2000 } });
for (const [name, file] of [['figma', 'figma.png'], ['runtime', 'runtime-after.png']]) {
  const image = `data:image/png;base64,${fs.readFileSync(`docs/quality/figma_parity/screens/PUB-03/${file}`).toString('base64')}`;
  await page.setContent(`<img id="source" src="${image}">`);
  await page.locator('img').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    const image = document.getElementById('source');
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.drawImage(image, 930, 2040, 500, 500, 0, 0, 2000, 2000);
    document.body.replaceChildren(canvas);
  });
  await page.screenshot({ path: `docs/quality/figma_parity/screens/PUB-03/${name}-related-zoom.png`, fullPage: true });
}
await browser.close();
