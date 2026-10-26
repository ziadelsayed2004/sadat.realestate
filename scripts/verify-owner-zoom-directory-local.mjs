import assert from 'node:assert/strict';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import mongoose from 'mongoose';
import sharp from 'sharp';
import {chromium,webkit,expect} from '@playwright/test';
import {readEnvironmentFile} from './environment-file.mjs';
import {createArgon2PasswordHasher} from '../apps/api/src/modules/auth/crypto.ts';

const env=await readEnvironmentFile('.env.local'), uri=new URL(env.MONGODB_URI), base='http://127.0.0.1:4173';
assert(['127.0.0.1','localhost'].includes(uri.hostname)&&uri.port==='27018');
const db=await mongoose.createConnection(uri.href).asPromise(), oid=()=>new mongoose.Types.ObjectId(), prefix=`owner-zoom-${Date.now()}`, now=new Date();
const users=[],properties=[],orgs=[],projects=[],contexts=[], errors=[];let browser;
const report={status:'RUNNING',mockedRoutes:false,checks:[],errors,cleanup:false};
const output='.tmp/owner-zoom';await mkdir(output,{recursive:true});
const password='Local-Zoom-Only!2026', hash=await createArgon2PasswordHasher().hash(password);
async function json(r,status=200){assert.equal(r.status(),status,(await r.text()).slice(0,500));return(await r.json()).data;}
async function account(type){
  const user={id:oid(),profile:oid(),application:oid(),email:`${prefix}-${type}@example.invalid`,name:`${prefix} ${type}`,type};users.push(user);
  await db.collection('users').insertOne({_id:user.id,roleType:'provider',status:'verified',normalizedEmail:user.email,version:0,createdAt:now,updatedAt:now});
  await db.collection('admin_credentials').insertOne({userId:user.id,passwordHash:hash,passwordChangedAt:now,version:0});
  await db.collection('provider_profiles').insertOne({_id:user.profile,userId:user.id,providerType:type,status:'approved',version:0});
  await db.collection('provider_applications').insertOne({_id:user.application,userId:user.id,providerType:type,status:'approved',brandName:user.name,displayName:user.name,version:0});
  const org={_id:oid(),providerId:user.profile,kind:type,status:'approved',slug:`${prefix}-${type.replaceAll('_','-')}`,name:{en:user.name,ar:user.name},imageUrl:'/assets/canonical/public/home-hero-sadat-city.png',logoUrl:'/assets/sadat-real-estate-logo.png',version:0};orgs.push(org);user.org=org;
  await db.collection('organizations').insertOne(org);
  return user;
}
async function rateWindow(){const r=await fetch(base+'/api/v1/public/bootstrap');if(r.status===429||Number(r.headers.get('ratelimit-remaining'))<40)await new Promise(resolve=>setTimeout(resolve,60_000));}
async function visit(page,url){await page.waitForLoadState('networkidle');await page.goto(base+url);await page.waitForLoadState('networkidle');}
try{
  browser=await chromium.launch();const owner=await browser.newContext();contexts.push(owner);
  const dev=await account('developer_company'),office=await account('brokerage_office');
  const seeker={id:oid(),profile:oid(),application:oid(),email:`${prefix}-seeker@example.invalid`};users.push(seeker);
  await db.collection('users').insertOne({_id:seeker.id,roleType:'seeker',status:'verified',normalizedEmail:seeker.email,version:0});
  await db.collection('admin_credentials').insertOne({userId:seeker.id,passwordHash:hash,passwordChangedAt:now});
  await db.collection('seeker_profiles').insertOne({_id:seeker.profile,userId:seeker.id,firstName:'Local',lastName:'Navigation',version:0});
  const admin=await json(await owner.request.post(base+'/api/v1/auth/login',{data:{email:'admin.demo@example.invalid',password:'LocalPreview-Admin-Only-2026!'}}));
  const adminHeaders={authorization:`Bearer ${admin.accessToken}`};
  async function subscription(user,active){const route=`/api/v1/admin/providers/${user.id}/public-identity-subscription`;const current=await json(await owner.request.get(base+route,{headers:adminHeaders}));return json(await owner.request.put(base+route,{headers:adminHeaders,data:{status:active?'active':'inactive',paymentConfirmed:true,...(active?{startAt:new Date(Date.now()-60_000).toISOString(),endAt:new Date(Date.now()+86_400_000).toISOString()}:{}),expectedVersion:current.version}}));}
  const directory=()=>owner.request.get(base+`/api/v1/public/developers?search=${prefix}`);
  assert.equal((await json(await directory())).total,0);
  assert.equal((await owner.request.get(base+`/api/v1/public/developers/${dev.org.slug}`)).status(),404);
  await subscription(dev,true);await subscription(office,true);
  const rows=await json(await directory());assert.deepEqual(rows.items.map(row=>row.id),[String(dev.org._id)]);assert.equal(rows.total,1);
  report.checks.push('Real administrative subscriptions: inactive developer hidden; activation lists developer; paid office stays out of directory');
  for(const user of [dev,office]){
    const login=await json(await owner.request.post(base+'/api/v1/auth/login',{data:{email:user.email,password}}));
    const headers={authorization:`Bearer ${login.accessToken}`};
    const created=await json(await owner.request.post(base+'/api/v1/provider/properties',{headers,data:{kind:'property',name:{en:`${prefix}-${user.type}`},transactionType:'sale',reason:'Local desktop zoom verification'}}),201);
    const id=new mongoose.Types.ObjectId(created.id);properties.push(id);user.property=id;
    const picture=await sharp({create:{width:600,height:1000,channels:3,background:'#d1a044'}}).composite([{input:await sharp({create:{width:500,height:900,channels:3,background:'#165748'}}).png().toBuffer(),left:50,top:50}]).jpeg().toBuffer();
    await json(await owner.request.post(base+`/api/v1/provider/properties/${id}/media`,{headers:{...headers,'content-type':'image/jpeg','x-media-kind':'image','x-file-name':'portrait.jpg'},data:picture}),201);
    const project=oid();projects.push(project);
    await db.collection('projects').insertOne({_id:project,organizationId:user.org._id,providerId:user.id,status:'draft',slug:`${prefix}-${user.type}-draft`,name:{en:'Unpublished project'}});
    await db.collection('properties').updateOne({_id:id},{$set:{status:'published',active:true,price:{amount:3250000,currency:'EGP'},area:{value:195,unit:'sqm'},layout:{bedrooms:3,bathrooms:1,floor:4},projectId:project,featured:true,featuredOrder:0,featuredAt:now,updatedAt:now}});
    const listed=await json(await owner.request.get(base+`/api/v1/admin/properties?search=${prefix}`,{headers:adminHeaders}));
    assert.equal(listed.items.find(row=>row.id===String(id))?.providerDisplayName,user.name);
  }
  const profile=await json(await owner.request.get(base+`/api/v1/public/developers/${dev.org.slug}`));assert.equal(profile.propertyCount,1);assert.equal(profile.projects.length,0);
  const officePublic=await json(await owner.request.get(base+`/api/v1/public/properties/${(await db.collection('properties').findOne({_id:office.property})).slug}`));assert.equal(officePublic.source.name.en,office.name);assert(officePublic.source.imageUrl);
  await subscription(dev,false);assert.equal((await json(await directory())).total,0);await subscription(dev,true);assert.equal((await json(await directory())).total,1);
  report.checks.push('Names resolve on real admin list; subscribed office retains public property name/photo; developer units return after reactivation');
  await owner.close();contexts.splice(contexts.indexOf(owner),1);await browser.close();browser=undefined;
  for(const engine of [chromium,webkit]){
    browser=await engine.launch();const context=await browser.newContext();contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push({engine:engine.name(),error:String(e)}));
    const property=await db.collection('properties').findOne({_id:dev.property});
    // Browser zoom changes the CSS viewport; cover the equivalent widths for a 1366px laptop plus narrow phones.
    for(const width of [390,820,1093,1366,1518,1920]){
      await rateWindow();await page.setViewportSize({width,height:950});
      for(const [route,selector]of [[`/?lang=ar`,'.public-homepage__property-card'],[`/properties?lang=ar&search=${prefix}`,'.public-property-listing__card']]){
        await visit(page,route);const card=page.locator(selector).filter({has:page.locator(`a[href*="${property.slug}"]`)}).first();await expect(card).toBeVisible();await card.scrollIntoViewIfNeeded();
        const image=card.locator('.ui-property-card__media > img');await expect(image).toHaveJSProperty('naturalWidth',576);
        const frame=await card.locator('.ui-property-card__media').boundingBox(),title=await card.locator('.ui-property-card__title').boundingBox(),price=await card.locator('.ui-property-card__price').boundingBox();
        assert(title.y>=frame.y+frame.height-1,JSON.stringify({width,frame,title}));assert(price.y>=frame.y+frame.height-1);assert(Math.abs(frame.width/frame.height-1.5)<.02);
        await expect(card.locator('.ui-property-card__price')).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        if(route.startsWith('/properties'))await card.screenshot({path:`${output}/${engine.name()}-listing-${width}.png`});
      }
      await visit(page,`/properties/${property.slug}?lang=ar`);const photo=page.locator('.public-property-details__gallery-main > img');await expect(photo).toHaveCSS('object-fit','contain');await expect(photo).toHaveJSProperty('naturalHeight',1000);
      await visit(page,`/developers/${dev.org.slug}?lang=ar`);await expect(page.locator(`#developer-properties a[href*="${property.slug}"]`).first()).toBeVisible();
      report.checks.push(`${engine.name()} ${width}px: home/search image never covers title or price; 3:2 cards and full portrait details; unpublished-project unit remains visible; no horizontal overflow`);
    }
    await context.close();contexts.splice(contexts.indexOf(context),1);
    const navContext=await browser.newContext();contexts.push(navContext);await navContext.addInitScript(()=>window.localStorage.setItem('sadat-real-estate.auth.session-hint','authenticated'));
    const navPage=await navContext.newPage();navPage.on('pageerror',e=>errors.push({engine:engine.name(),error:String(e)}));
    for(const [role,email,secret,rail,toggle]of [
      ['provider',dev.email,password,'.provider-dashboard__navigation','provider-navigation-list'],
      ['seeker',seeker.email,password,'.seeker-dashboard__nav','seeker-dashboard-navigation'],
      ['admin','admin.demo@example.invalid','LocalPreview-Admin-Only-2026!','.admin-dashboard__navigation','admin-dashboard-navigation']
    ]){
      await rateWindow();await json(await navContext.request.post(base+'/api/v1/auth/login',{data:{email,password:secret}}));
      for(const width of [390,1440]){
        await navPage.setViewportSize({width,height:950});await visit(navPage,`/${role}?lang=en`);
        if(width===390)await navPage.locator(`button[aria-controls="${toggle}"]`).click();
        const guide=navPage.locator(`${rail} a[href="/${role}/user-guide?lang=en"]`),home=navPage.locator(`${rail} a[href="/?lang=en"]`);
        await expect(guide).toBeVisible();await expect(home).toBeVisible();
        assert(await guide.evaluate(el=>{const item=el.closest('li')??el;return item.nextElementSibling?.querySelector('a[href="/?lang=en"]')!==null&&item.nextElementSibling?.querySelector('a[href="/?lang=en"]')!==undefined||el.nextElementSibling?.matches('a[href="/?lang=en"]');}));
      }
      report.checks.push(`${engine.name()} ${role}: website return follows user guide directly in desktop and mobile sidebar`);
    }
    await navContext.request.post(base+'/api/v1/auth/logout',{data:{}});await navContext.close();contexts.splice(contexts.indexOf(navContext),1);await browser.close();browser=undefined;
  }
  assert.deepEqual(errors,[]);report.status='PASS_LOCAL';
}catch(e){report.status='FAIL_LOCAL';report.error=String(e.stack??e);process.exitCode=1;}
finally{
  for(const context of contexts)await context.close().catch(()=>{});await browser?.close().catch(()=>{});
  const storage=path.resolve(env.PRIVATE_STORAGE_LOCAL_ROOT||path.join(os.tmpdir(),'sadat-real-estate-private-storage'));
  for(const row of await db.collection('property_media').find({propertyId:{$in:properties}}).toArray())if(typeof row.storageKey==='string'&&/^quarantine\/[a-f0-9]{32}$/u.test(row.storageKey)){const target=path.resolve(storage,row.storageKey);assert(target.startsWith(storage+path.sep));await rm(target,{force:true});}
  for(const name of ['properties','property_media','property_view_events'])await db.collection(name).deleteMany({$or:[{_id:{$in:properties}},{propertyId:{$in:properties}}]});
  for(const user of users){for(const name of ['users','provider_profiles','provider_applications','seeker_profiles','admin_credentials','sessions','notifications'])await db.collection(name).deleteMany({$or:[{_id:{$in:[user.id,user.profile,user.application]}},{userId:user.id},{recipientId:user.id}]});await db.collection('audit_logs').deleteMany({actorId:String(user.id)});await db.collection('provider_identity_subscriptions').deleteOne({_id:user.id});}
  await db.collection('audit_logs').deleteMany({targetId:{$in:[...users.map(user=>String(user.id)),...properties.map(String)]}});
  await db.collection('organizations').deleteMany({_id:{$in:orgs.map(row=>row._id)}});await db.collection('projects').deleteMany({_id:{$in:projects}});await db.close();report.cleanup=true;
  await writeFile('docs/quality/guide-runs/owner-zoom-directory-local-latest.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
