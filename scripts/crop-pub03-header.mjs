import fs from 'node:fs';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 180 } });
for (const [name, file] of [['figma', 'figma.png'], ['runtime', 'runtime-after.png']]) {
  const image = `data:image/png;base64,${fs.readFileSync(`docs/quality/figma_parity/screens/PUB-03/${file}`).toString('base64')}`;
  await page.setContent(`<img src="${image}" style="display:block">`);
  await page.locator('img').waitFor({ state: 'visible' });
  await page.screenshot({ path: `docs/quality/figma_parity/screens/PUB-03/${name}-header-crop.png`, clip: { x: 0, y: 0, width: 1577, height: 120 } });
}
await browser.close();
