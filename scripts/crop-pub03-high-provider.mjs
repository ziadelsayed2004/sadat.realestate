import fs from 'node:fs';
import { chromium } from '@playwright/test';

const source = 'docs/design_sources/final_screens/public/PUB-03.png';
const out = 'docs/quality/figma_parity/screens/PUB-03/figma-high-provider.png';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 6400, height: 12200 } });
await page.setContent(`<img src="data:image/png;base64,${fs.readFileSync(source).toString('base64')}" style="display:block">`);
await page.locator('img').waitFor({ state: 'visible' });
await page.screenshot({ path: out, clip: { x: 2240, y: 3320, width: 3520, height: 720 } });
await browser.close();
