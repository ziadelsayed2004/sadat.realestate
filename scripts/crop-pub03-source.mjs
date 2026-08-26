import fs from 'node:fs';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 900 } });
const image = `data:image/png;base64,${fs.readFileSync('docs/quality/figma_parity/screens/PUB-03/figma.png').toString('base64')}`;
await page.setContent(`<img src="${image}" style="display:block">`);
await page.locator('img').waitFor({ state: 'visible' });
await page.screenshot({ path: 'docs/quality/figma_parity/screens/PUB-03/source-summary-crop.png', clip: { x: 120, y: 140, width: 1320, height: 850 } });
await browser.close();
