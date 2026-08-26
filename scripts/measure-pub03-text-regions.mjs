import fs from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'docs/quality/figma_parity/screens/PUB-03';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 3200 } });
for (const file of ['figma.png', 'runtime-after.png']) {
  await page.setContent(`<img id="image" src="data:image/png;base64,${fs.readFileSync(`${root}/${file}`).toString('base64')}">`);
  const result = await page.evaluate(() => {
    const image = document.querySelector('#image'); const canvas = document.createElement('canvas'); canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const data=context.getImageData(0,0,canvas.width,canvas.height).data;
    const groups=(region,predicate)=>{const [x,y,w,h]=region;const rows=[];for(let yy=y;yy<y+h;yy++){let min=canvas.width,max=-1,n=0;for(let xx=x;xx<x+w;xx++){const i=(yy*canvas.width+xx)*4;if(predicate(data[i],data[i+1],data[i+2])){min=Math.min(min,xx);max=Math.max(max,xx);n++}}if(n)rows.push({y:yy,min,max,n})}const gs=[];for(const row of rows){const g=gs.at(-1);if(!g||row.y>g.at(-1).y+1)gs.push([row]);else g.push(row)}return gs.map(g=>({y:g[0].y,height:g.at(-1).y-g[0].y+1,min:Math.min(...g.map(r=>r.min)),max:Math.max(...g.map(r=>r.max)),width:Math.max(...g.map(r=>r.max))-Math.min(...g.map(r=>r.min))+1,pixels:g.reduce((s,r)=>s+r.n,0)}));};
    const dark=(r,g,b)=>r<110&&g<115&&b<130; const gray=(r,g,b)=>r<190&&g<190&&b<200&&Math.max(r,g,b)-Math.min(r,g,b)<50;
    return {source:groups([950,850,450,110],dark),summary:groups([600,590,800,100],dark),sidebar:groups([170,245,380,60],dark),footer:groups([100,2670,1300,220],dark),mutedSource:groups([950,850,450,110],gray)};
  });
  console.log(file, JSON.stringify(result));
}
await browser.close();
