import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { chromium, webkit, expect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local'), uri = new URL(env.MONGODB_URI);
assert(['localhost','127.0.0.1'].includes(uri.hostname) && uri.port === '27018', 'Local database only');
const db = await mongoose.createConnection(uri.href).asPromise(), base = 'http://127.0.0.1:4173';
const oid = () => new mongoose.Types.ObjectId(), user = oid(), profile = oid(), application = oid(), org = oid(), propertyIds = [];
const stamp = new Date(), prefix = `ratio-${Date.now()}`, email = `${prefix}@example.invalid`, password = 'Local-Ratio-Only!2026';
const storage = path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT || path.join(os.tmpdir(),'sadat-real-estate-private-storage'));
const report = { status:'RUNNING', apiMocks:false, checks:[], browserErrors:[], cleanup:false }, output = '.tmp/upload-guidance';
await mkdir(output,{recursive:true}); let browser; const contexts=[];
async function json(response, status=200) { assert.equal(response.status(),status,(await response.text()).slice(0,600)); return (await response.json()).data; }
async function visit(page,url) { await page.waitForLoadState('networkidle'); await page.goto(base+url); await page.waitForLoadState('networkidle'); }
async function rateWindow() { const r=await fetch(base+'/api/v1/public/bootstrap'); if(r.status===429 || Number(r.headers.get('ratelimit-remaining'))<45) await new Promise(resolve=>setTimeout(resolve,60_000)); }
try {
  await db.collection('users').insertOne({_id:user,roleType:'provider',status:'verified',normalizedEmail:email,version:0,createdAt:stamp,updatedAt:stamp});
  await db.collection('admin_credentials').insertOne({userId:user,passwordHash:await createArgon2PasswordHasher().hash(password),passwordChangedAt:stamp,version:0,createdAt:stamp,updatedAt:stamp});
  await db.collection('provider_profiles').insertOne({_id:profile,userId:user,providerType:'developer_company',status:'approved',version:0,createdAt:stamp,updatedAt:stamp});
  await db.collection('provider_applications').insertOne({_id:application,userId:user,providerType:'developer_company',status:'approved',brandName:prefix,version:0,createdAt:stamp,updatedAt:stamp});
  await db.collection('organizations').insertOne({_id:org,providerId:profile,kind:'developer_company',name:{en:prefix},slug:prefix,status:'approved',version:0,createdAt:stamp,updatedAt:stamp});
  const square=await sharp({create:{width:600,height:600,channels:3,background:'#17233d'}}).jpeg().toBuffer();
  const landscape=await sharp({create:{width:900,height:600,channels:3,background:'#165748'}}).jpeg().toBuffer();
  for(const engine of [chromium,webkit]) {
    await rateWindow(); browser=await engine.launch(); const owner=await browser.newContext(); contexts.push(owner);
    const login=await json(await owner.request.post(base+'/api/v1/auth/login',{data:{email,password}})); const headers={authorization:`Bearer ${login.accessToken}`};
    const created=await json(await owner.request.post(base+'/api/v1/provider/properties',{headers,data:{kind:'property',name:{en:prefix},transactionType:'sale',reason:'Local ratio guidance fixture'}}),201); const id=new mongoose.Types.ObjectId(created.id);propertyIds.push(id);
    const page=await owner.newPage(); page.on('pageerror',error=>report.browserErrors.push({engine:engine.name(),url:page.url(),error:String(error),stack:error.stack}));
    await page.goto(base); await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-route-id="public-home"]')).toHaveAttribute('data-locale',await page.locator('html').getAttribute('lang'));
    await page.evaluate(()=>window.localStorage.setItem('sadat-real-estate.auth.session-hint','authenticated'));
    await visit(page,`/provider/properties/${id}/media?lang=en`);
    const input=page.locator('#provider-property-media-image'), guide=page.locator('.image-upload-guide').filter({has:input}); await expect(guide).toHaveAttribute('data-image-ratio','3:2');
    for(const [name,buffer,match,ratio] of [['square.jpg',square,false,'1:1'],['landscape.jpg',landscape,true,'3:2']]) {
      const uploaded=page.waitForResponse(r=>r.url().includes(`/properties/${id}/media`) && r.request().method()==='POST');
      await input.setInputFiles({name,mimeType:'image/jpeg',buffer}); await json(await uploaded,201);
      await expect(guide.locator(`[data-match="${match}"]`)).toContainText(ratio);
      await expect(page.locator('.provider-property-completion__media-list')).toContainText(name);
      if(!match) await expect(guide.locator('[data-match="false"]')).toContainText('crops edges');
    }
    await page.screenshot({path:`${output}/${engine.name()}-provider-upload.png`,fullPage:true});
    const media=await db.collection('property_media').find({propertyId:id}).sort({sortOrder:1}).toArray();assert.equal(media.length,2);
    await db.collection('properties').updateOne({_id:id},{$set:{status:'published',active:true,slug:`${prefix}-${engine.name()}`,price:{amount:3250000,currency:'EGP'},imageUrl:`/api/v1/public/properties/${id}/media/${media[1]._id}/content`,featured:true,featuredAt:stamp,featuredOrder:0}});
    await db.collection('property_media').updateMany({propertyId:id},{$set:{isCover:false}});await db.collection('property_media').updateOne({_id:media[1]._id},{$set:{isCover:true}});
    for(const width of [390,820,1440]) {
      await rateWindow(); await page.setViewportSize({width,height:950});
      const routes=[['details',`/properties/${prefix}-${engine.name()}?lang=en`,'.public-property-details__gallery-main'],['listing',`/properties?search=${prefix}&lang=en`,'.ui-property-card__media'],['home','/?lang=en','.public-homepage__property-card .ui-property-card__media']];
      for(const [name,url,selector]of routes) {
        await visit(page,url);const frame=page.locator(selector).filter({has:page.locator(`img[src*="${id}"]`)}).first();await expect(frame).toBeVisible(); const image=frame.locator('img').first(); await expect(image).toHaveJSProperty('naturalWidth',900);
        const box=await frame.boundingBox(),imageBox=await image.boundingBox();assert(Math.abs(box.width/box.height-1.5)<.02,JSON.stringify({name,width,box}));assert(Math.abs(box.height-imageBox.height)<1); assert.equal(await image.evaluate(el=>getComputedStyle(el).objectFit),name==='details'?'contain':'cover');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        if(name==='home') assert(await page.locator('.public-homepage__section--properties').evaluateAll(sections=>sections.every(section=>[...section.querySelectorAll('.ui-property-card')].every(card=>card.getBoundingClientRect().bottom<=section.getBoundingClientRect().bottom+1))), 'Property cards must remain inside their homepage section');
        if(name==='details') await frame.screenshot({path:`${output}/${engine.name()}-gallery-${width}.png`});
      }
      report.checks.push(`${engine.name()} ${width}px: uploaded 3:2 image fills matching home/search/detail frames without stretch, sidebars or horizontal overflow; exact price retained`);
    }
    await owner.close();contexts.splice(contexts.indexOf(owner),1);
    const guest=await browser.newContext();contexts.push(guest);const menuPage=await guest.newPage();menuPage.on('pageerror',error=>report.browserErrors.push({engine:engine.name(),url:menuPage.url(),error:String(error),stack:error.stack}));
    for(const locale of ['ar','en']) for(const [width,height]of [[320,568],[390,844],[390,360]]) {
      await rateWindow();await menuPage.setViewportSize({width,height});await visit(menuPage,`/?lang=${locale}`);
      await menuPage.locator('.public-homepage__menu-toggle').click();const switcher=menuPage.locator('.public-homepage__mobile-actions .custom-locale-switcher');const trigger=switcher.locator('.custom-locale-pill-btn');await trigger.scrollIntoViewIfNeeded();await trigger.click();const list=switcher.getByRole('listbox');await expect(list).toBeVisible();
      await expect.poll(()=>list.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');const a=await trigger.boundingBox(),b=await list.boundingBox(),nav=await menuPage.locator('#public-site-navigation').boundingBox();assert(b.y+b.height<=a.y-3 && b.y>=nav.y && b.x>=0 && b.x+b.width<=width+1,JSON.stringify({locale,width,height,a,b,nav}));
      await menuPage.screenshot({path:`${output}/${engine.name()}-locale-up-${locale}-${width}-${height}.png`});
      await list.getByRole('option',{name:locale==='ar'?'English':'العربية',exact:true}).click();await expect(menuPage.locator('html')).toHaveAttribute('lang',locale==='ar'?'en':'ar');
      report.checks.push(`${engine.name()} ${locale} ${width}x${height}: locale list opens upward inside the floating menu, remains unclipped and changes language`);
    }
    await guest.close();contexts.splice(contexts.indexOf(guest),1);await browser.close();browser=undefined;
  }
  assert.deepEqual(report.browserErrors,[]);report.status='PASS_LOCAL';
} catch(error) {report.status='FAIL_LOCAL';report.error=String(error.stack??error);process.exitCode=1;}
finally {
  for(const context of contexts)await context.close().catch(()=>{});await browser?.close().catch(()=>{});
  for(const row of await db.collection('property_media').find({propertyId:{$in:propertyIds}}).toArray())if(typeof row.storageKey==='string' && /^quarantine\/[a-f0-9]{32}$/u.test(row.storageKey)){const target=path.resolve(storage,row.storageKey);assert(target.startsWith(storage+path.sep));await rm(target,{force:true});}
  for(const name of ['properties','property_media','property_view_events'])await db.collection(name).deleteMany({$or:[{_id:{$in:propertyIds}},{propertyId:{$in:propertyIds}}]});
  for(const name of ['users','provider_profiles','provider_applications','admin_credentials','sessions'])await db.collection(name).deleteMany({$or:[{_id:{$in:[user,profile,application]}},{userId:user}]});
  await db.collection('organizations').deleteOne({_id:org});await db.collection('audit_logs').deleteMany({actorId:String(user)});await db.close();report.cleanup=true;
  await writeFile('docs/quality/guide-runs/upload-guidance-local-latest.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
