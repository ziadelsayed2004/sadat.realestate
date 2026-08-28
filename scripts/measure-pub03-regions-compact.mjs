import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 3200 } });
for (const file of ['figma.png', 'runtime-after.png']) {
  await page.setContent(`<img id="image" src="data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}">`);
  const result = await page.evaluate(() => {
    const image = document.querySelector('#image');
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const bbox = (region, predicate) => { const [x, y, width, height] = region; let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1,count=0; for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++){const i=(yy*canvas.width+xx)*4;if(!predicate(data[i],data[i+1],data[i+2]))continue;minX=Math.min(minX,xx);minY=Math.min(minY,yy);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,yy);count++;}return count?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1,count}:null; };
    const gold=(r,g,b)=>r>140&&r>g*1.1&&g>b*1.15&&b<180;
    const navy=(r,g,b)=>r<90&&g<100&&b<120;
    const rows = (region, predicate) => { const [x,y,w,h]=region; const out=[]; for(let yy=y;yy<y+h;yy++){let c=0,min=canvas.width,max=-1;for(let xx=x;xx<x+w;xx++){const i=(yy*canvas.width+xx)*4;if(predicate(data[i],data[i+1],data[i+2])){c++;min=Math.min(min,xx);max=Math.max(max,xx)}}if(c>0)out.push({y:yy,min,max,count:c})}const groups=[];for(const row of out){const g=groups.at(-1);if(!g||row.y>g.at(-1).y+1)groups.push([row]);else g.push(row)}return groups.map(g=>({y:g[0].y,height:g.at(-1).y-g[0].y+1,min:Math.min(...g.map(v=>v.min)),max:Math.max(...g.map(v=>v.max)),width:Math.max(...g.map(v=>v.max))-Math.min(...g.map(v=>v.min))+1,pixels:g.reduce((s,v)=>s+v.count,0)})); };
    return {
      relatedGold: bbox([1000, 2320, 405, 170], gold),
      relatedNavy: rows([1000, 2320, 405, 180], navy),
      summaryGold: bbox([600, 580, 300, 100], gold),
      summaryNavy: rows([1000, 590, 400, 100], navy),
    };
  });
  console.log(file, JSON.stringify(result));
}
await browser.close();
