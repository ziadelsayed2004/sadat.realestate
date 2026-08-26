import fs from 'node:fs';
import { chromium } from '@playwright/test';
const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:6400,height:12200}});
await p.setContent(`<img src="data:image/png;base64,${fs.readFileSync('docs/design_sources/final_screens/public/PUB-03.png').toString('base64')}" style="display:block">`);
await p.locator('img').waitFor({state:'visible'});
await p.screenshot({path:'docs/quality/figma_parity/screens/PUB-03/figma-high-related.png',clip:{x:4000,y:8200,width:1600,height:1500}});
await b.close();
