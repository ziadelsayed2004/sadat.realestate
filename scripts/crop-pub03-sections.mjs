import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const clips = {
  sidebar: { x: 130, y: 140, width: 450, height: 580 },
  summary: { x: 560, y: 540, width: 880, height: 330 },
  source: { x: 560, y: 830, width: 880, height: 180 },
  description: { x: 560, y: 970, width: 880, height: 190 },
  gallery: { x: 560, y: 140, width: 880, height: 450 },
  amenities: { x: 560, y: 1130, width: 880, height: 380 },
  nearby: { x: 560, y: 1480, width: 880, height: 400 },
  advisory: { x: 560, y: 1845, width: 880, height: 220 },
  related: { x: 900, y: 2025, width: 560, height: 520 },
  footer: { x: 0, y: 2600, width: 1577, height: 446 }
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 3200 } });
for (const [name, file] of [['figma', 'figma.png'], ['runtime', 'runtime-after.png']]) {
  const image = 'data:image/png;base64,' + fs.readFileSync(root + '/' + file).toString('base64');
  await page.setContent('<img src="' + image + '" style="display:block">');
  await page.locator('img').waitFor({ state: 'visible' });
  for (const [section, clip] of Object.entries(clips)) {
    await page.screenshot({ path: root + '/' + name + '-' + section + '-crop.png', clip });
  }
}
await browser.close();
