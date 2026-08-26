import fs from 'node:fs';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 2600 } });
for (const [name, file] of [['figma', 'figma.png'], ['runtime', 'runtime-after.png']]) {
  const image = `data:image/png;base64,${fs.readFileSync(`docs/quality/figma_parity/screens/PUB-03/${file}`).toString('base64')}`;
  await page.setContent(`<img src="${image}" style="display:block">`);
  await page.locator('img').waitFor({ state: 'visible' });
  await page.screenshot({ path: `docs/quality/figma_parity/screens/PUB-03/${name}-related-crop.png`, clip: { x: 930, y: 2040, width: 500, height: 500 } });
}
await browser.close();
