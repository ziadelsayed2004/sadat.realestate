import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, webkit, expect as baseExpect } from '@playwright/test';
import { createArgon2PasswordHasher } from '../apps/api/src/modules/auth/crypto.ts';
const env = Object.fromEntries((await readFile('.env.local','utf8')).split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const at=l.indexOf('=');return[l.slice(0,at),l.slice(at+1).replace(/^['"]|['"]$/g,'')];}));
assert(env.MONGODB_URI.includes(':27018/'));
const db = await mongoose.createConnection(env.MONGODB_URI).asPromise(), browser = await chromium.launch(), safari = await webkit.launch();
const expect = baseExpect.configure({ timeout: 20000 }), base = 'http://127.0.0.1:4173', prefix = 'oct19qa' + Date.now(), at = new Date(), password = 'Oct19-Custom-Admin!2026';
const names = ['placement','settings','admin','provider','seeker','role','request','proof','quote','post','report','area','property','banner','banner2','bannerMedia','bannerMedia2'];
const ids = Object.fromEntries(names.map(name=>[name,new mongoose.Types.ObjectId()]));
const root = '.tmp/oct19-browser'; await mkdir(root,{recursive:true});
const report = { status:'FAIL_LOCAL', mockedResponses:false, checks:[], http:[], cleanup:false };
const permissions = ['admin:ads.price','admin:ads.schedule','admin:payments.review','admin:community.view','admin:community.moderate']; // Deliberately omit ads.view: legacy saved role.
const contexts = [];
async function login(context, name) { const r=await context.request.post(base+'/api/v1/auth/login',{data:{email:prefix+'-'+name+'@example.invalid',password}}); assert.equal(r.status(),200,await r.text()); return (await r.json()).data.accessToken; }
async function api(context, token, url, data, method='GET', status=200) { const r=await context.request.fetch(base+'/api/v1'+url,{method,data,headers:{authorization:'Bearer '+token}}); const json=await r.json(); report.http.push({url,method,status:r.status()}); assert.equal(r.status(),status,JSON.stringify(json)); return json.data; }
async function snap(page,name,fullPage=true) { await expect(page.locator('[data-auth-resolution=pending]')).toHaveCount(0); await expect(page.locator('#site-intro')).toBeHidden(); await page.evaluate(async()=>{await document.fonts.ready; await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}); await page.screenshot({path:root+'/'+name+'.png',fullPage}); }
try {
  const hash=await createArgon2PasswordHasher().hash(password);
  await db.collection('users').insertMany(['admin','provider','seeker'].map(name=>({_id:ids[name],normalizedEmail:prefix+'-'+name+'@example.invalid',roleType:name,status:'verified',locale:'ar',version:0,createdAt:at,updatedAt:at})));
  await db.collection('admin_credentials').insertMany(['admin','provider','seeker'].map(name=>({userId:ids[name],passwordHash:hash,passwordChangedAt:at,createdAt:at,updatedAt:at})));
  await db.collection('admin_accounts').insertOne({userId:ids.admin,displayName:'Limited Ads Reviewer',accessLevel:'standard_admin',createdAt:at,updatedAt:at});
  await db.collection('admin_profiles').insertOne({userId:ids.admin,createdAt:at,updatedAt:at});
  await db.collection('roles').insertOne({_id:ids.role,name:prefix,nameKey:prefix,accessMode:'custom',permissions,active:true,version:0,createdBy:ids.admin,updatedBy:ids.admin,createdAt:at,updatedAt:at});
  await db.collection('admin_role_assignments').insertOne({adminUserId:ids.admin,roleIds:[ids.role],assignedBy:ids.admin,assignedAt:at,version:0,createdAt:at,updatedAt:at});
  await db.collection('seeker_profiles').insertOne({userId:ids.seeker,firstName:'QA',lastName:'Reporter',createdAt:at,updatedAt:at});
  await db.collection('ad_requests').insertOne({_id:ids.request,providerId:ids.provider,purpose:prefix+' advertisement',placementKey:'homepage.hero',adType:'banner',intervalStart:new Date(+at+86400000*30),intervalEnd:new Date(+at+86400000*31),status:'review',version:0,history:[],createdAt:at,updatedAt:at});
  await db.collection('community_posts').insertOne({_id:ids.post,id:String(ids.post),authorId:String(ids.seeker),title:prefix+' post',body:'Community moderation QA body',category:'question',status:'draft',commentCount:0,version:0,createdAt:at.toISOString(),updatedAt:at.toISOString()});
  await db.collection('community_reports').insertOne({_id:ids.report,id:String(ids.report),postId:String(ids.post),reporterId:String(ids.seeker),reason:'other',details:'Please review this community post',status:'open',version:0,createdAt:at.toISOString(),updatedAt:at.toISOString()});
  await db.collection('locations').insertOne({_id:ids.area,kind:'neighborhood',name:{ar:'المنطقة 22',en:'Area 22'},slug:prefix,active:true,order:0,version:0,createdAt:at,updatedAt:at});
  await db.collection('properties').insertOne({_id:ids.property,providerId:ids.provider,sourceType:'individual_broker',kind:'property',name:{ar:'عقار اختبار',en:'QA property'},slug:prefix,transactionType:'sale',status:'draft',active:true,version:0,createdAt:at,updatedAt:at});
  await db.collection('ad_settings').insertOne({_id:ids.settings,enabled:true,allowedSurfaces:['homepage']});
  await db.collection('ad_placements').insertOne({_id:ids.placement,key:prefix,surface:'homepage',active:true,targetUrlRequired:false,label:{ar:'QA',en:'QA'}});
  for(const suffix of ['', '2']) {
    await db.collection('ad_banners').insertOne({_id:ids['banner'+suffix],placementKey:prefix,title:{ar:suffix?'مساحة تستحق التجربة':'عقارك في قلب السادات',en:suffix?'Space for your future':'Your home in Sadat'},body:{ar:'ابحث عن المكان المناسب لك',en:'Find your next place'},mediaId:ids['bannerMedia'+suffix],mediaIds:[ids['bannerMedia'+suffix]],startAt:new Date(+at-3600000),endAt:new Date(+at+86400000),status:'active',sortOrder:0,displaySeconds:60,version:0,createdBy:ids.admin,updatedBy:ids.admin,createdAt:at,updatedAt:at});
    await db.collection('ad_banner_media').insertOne({_id:ids['bannerMedia'+suffix],bannerId:ids['banner'+suffix],url:suffix?'/assets/canonical/public/home-hero-sadat-city.png':'/assets/canonical/public/property-home.png',mime:'image/png',width:1440,height:900,active:true,version:0,createdBy:ids.admin,createdAt:at,updatedAt:at});
  }
  const admin=await browser.newContext(); contexts.push(admin); await login(admin,'admin'); const page=await admin.newPage();
  await page.goto(base+'/admin/ads/requests?requestId='+ids.request+'&lang=ar');
  const review=page.locator('form.admin-ads__review-card'); await expect(review).toBeVisible(); await page.locator('#admin-ad-request-review-reason').fill('Reviewed by limited custom advertising role');
  const approval=page.waitForResponse(r=>r.url().includes('/ad-requests/'+ids.request+'/review')&&r.request().method()==='POST'); await review.locator('button[type=submit]').click(); assert.equal((await approval).status(),200);
  await expect(page.locator('#admin-ad-quote-amount')).toBeVisible(); await page.locator('#admin-ad-quote-amount').fill('10000'); await page.locator('#admin-ad-quote-description').fill('QA agreed advertising period'); await page.locator('#admin-ad-quote-terms').fill('QA agreed advertising terms');
  const quoteResponse=page.waitForResponse(r=>r.url().includes('/ad-requests/'+ids.request+'/quote')&&r.request().method()==='POST'); await page.locator('form.admin-ads__review-card button[type=submit]').click(); const qr=await quoteResponse; assert.equal(qr.status(),201,await qr.text());
  report.checks.push('legacy_custom_role_without_explicit_ads_view_can_open_accept_and_price_request_in_browser'); await snap(page,'custom-role-ad-approved');
  const apiContext=await browser.newContext(); contexts.push(apiContext); const token=await login(apiContext,'admin');
  await api(apiContext,token,'/admin/roles',undefined,'GET',403);
  const quote=await db.collection('ad_quotes').findOne({requestId:ids.request}); assert(quote);
  // Prepare an accepted quote/clean receipt; review and scheduling still go through real guarded APIs.
  await db.collection('ad_quotes').updateOne({_id:quote._id},{$set:{status:'accepted'}});
  await db.collection('ad_requests').updateOne({_id:ids.request},{$set:{status:'waiting_payment'}});
  await db.collection('payment_proofs').insertOne({_id:ids.proof,adRequestId:ids.request,providerId:ids.provider,originalFilename:'receipt.png',normalizedExtension:'.png',detectedMime:'image/png',byteSize:100,sha256:'b'.repeat(64),storageKey:'quarantine/'+String(ids.proof).padEnd(32,'b'),securityState:'clean',status:'pending_review',reviewHistory:[],uploadedAt:at,active:true,idempotentReplay:false,version:1});
  await api(apiContext,token,'/admin/payment-proofs/'+ids.proof+'/review',{action:'approve',reason:'Receipt checked by assigned custom role',expectedVersion:1},'POST');
  const request=await db.collection('ad_requests').findOne({_id:ids.request});
  await api(apiContext,token,'/admin/ad-requests/'+ids.request+'/schedule',{expectedVersion:request.version},'POST');
  report.checks.push('custom_role_can_review_payment_and_schedule_but_cannot_manage_roles');
  await page.goto(base+'/admin/community?lang=ar'); await expect(page.getByTestId('admin-community-post-'+ids.post)).toBeVisible();
  await expect.poll(async()=>db.collection('admin_attention_reads').countDocuments({_id:String(ids.admin)+':community:'+ids.post})).toBe(1);
  const counts=await api(apiContext,token,'/admin/notifications?limit=1'); assert.equal(counts.attention.counts.community,0);
  await page.goto(base+'/admin/community/moderation?lang=ar'); const row=page.getByTestId('admin-community-report-'+ids.report); await expect(row.locator('.admin-community__pending-dot')).toBeVisible();
  await row.getByRole('button').click(); await page.locator('#admin-community-report-reason').fill('Reviewed the report and resolved the reported issue'); await page.getByTestId('admin-community-resolution').locator('button[type=submit]').click();
  await expect(row.locator('.admin-community__pending-dot')).toHaveCount(0); await snap(page,'community-resolved');
  report.checks.push('community_list_clears_custom_admin_read_badge_and_report_red_mark_disappears_only_on_resolution');
  const provider=await safari.newContext({viewport:{width:390,height:844}}); contexts.push(provider); await login(provider,'provider'); const providerPage=await provider.newPage();
  await providerPage.goto(base+'/provider/properties/'+ids.property+'/location?lang=ar'); await expect(providerPage.locator('#provider-property-location-id')).toBeEnabled();
  await providerPage.locator('#provider-property-location-search').fill('المنطقة ال٢٢'); await providerPage.getByRole('button',{name:'المنطقة 22',exact:true}).click(); await expect(providerPage.locator('#provider-property-location-id')).toHaveValue(String(ids.area));
  await providerPage.locator('#provider-property-location-search').fill('unmatched district xyz'); assert(await providerPage.locator('#provider-property-location-id option').count()>1); await snap(providerPage,'location-search-mobile');
  report.checks.push('webkit_location_arabic_number_click_selection_and_no_match_keeps_full_choices');
  await new Promise(resolve=>setTimeout(resolve,61000));
  for (const [width,locale] of [[320,'ar'],[390,'ar'],[768,'en'],[1440,'ar']]) {
    const ctx=await safari.newContext({viewport:{width,height:900}}); contexts.push(ctx); const p=await ctx.newPage(); await p.goto(base+'/?lang='+locale); await expect(p.locator('.public-homepage__hero h1')).toBeVisible();
    await expect(p.locator('[data-auth-resolution=pending]')).toHaveCount(0);
    const geometry=await p.evaluate(()=>{const visual=document.querySelector('.public-homepage__hero-visual').getBoundingClientRect(),title=document.querySelector('.public-homepage__hero h1').getBoundingClientRect(),search=document.querySelector('.public-homepage__search').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth+1,titleInImage:title.top>=visual.top&&title.bottom<=visual.bottom,center:Math.abs((title.left+title.right)/2-(visual.left+visual.right)/2),overlap:search.top<visual.bottom&&search.bottom>visual.bottom};});
    assert.equal(geometry.overflow,false,JSON.stringify(geometry)); assert(geometry.titleInImage&&geometry.center<2&&geometry.overlap,JSON.stringify(geometry));
    const next=p.getByRole('button',{name:locale==='ar'?'الصورة التالية':'Next image',exact:true}), prev=p.getByRole('button',{name:locale==='ar'?'الصورة السابقة':'Previous image',exact:true}); await expect(next).toBeVisible();
    const nextBox=await next.boundingBox(),prevBox=await prev.boundingBox(); assert(locale==='ar'?nextBox.x<prevBox.x:nextBox.x>prevBox.x);
    const before=await p.locator('.public-homepage__hero-image:visible').getAttribute('src'); await next.click(); await expect.poll(()=>p.locator('.public-homepage__hero-image:visible').getAttribute('src')).not.toBe(before); await prev.click(); await expect.poll(()=>p.locator('.public-homepage__hero-image:visible').getAttribute('src')).toBe(before);
    await snap(p,'hero-'+locale+'-'+width,false); await ctx.close(); contexts.splice(contexts.indexOf(ctx),1);
  }
  report.checks.push('real_webkit_320_390_768_1440_centered_cover_search_overlap_and_working_rtl_ltr_arrows');
  report.status='PASS_LOCAL';
} catch(error) {report.error=String(error.stack??error);process.exitCode=1;}
finally {
  for(const context of contexts) await context.close();
  for(const collection of ['sessions','admin_credentials','provider_profiles','provider_applications','admin_accounts','admin_profiles','seeker_profiles']) await db.collection(collection).deleteMany({userId:{$in:[ids.admin,ids.provider,ids.seeker]}});
  await db.collection('admin_role_assignments').deleteMany({adminUserId:ids.admin}); await db.collection('roles').deleteOne({_id:ids.role});
  for(const collection of ['ad_requests','payment_proofs','ad_quotes']) await db.collection(collection).deleteMany({providerId:ids.provider});
  await db.collection('ad_schedules').deleteMany({providerId:ids.provider}); await db.collection('community_posts').deleteOne({_id:ids.post}); await db.collection('community_reports').deleteOne({_id:ids.report});
  await db.collection('admin_attention_reads').deleteMany({_id:{$regex:'^'+ids.admin+':'}}); await db.collection('notifications').deleteMany({recipientId:{$in:[ids.admin,ids.provider,ids.seeker]}});
  await db.collection('audit_logs').deleteMany({actorId:{$in:[ids.admin,ids.provider,ids.seeker]}}); await db.collection('properties').deleteOne({_id:ids.property}); await db.collection('locations').deleteOne({_id:ids.area});
  await db.collection('ad_banners').deleteMany({_id:{$in:[ids.banner,ids.banner2]}}); await db.collection('ad_banner_media').deleteMany({_id:{$in:[ids.bannerMedia,ids.bannerMedia2]}}); await db.collection('users').deleteMany({_id:{$in:[ids.admin,ids.provider,ids.seeker]}});
  await db.collection('ad_settings').deleteOne({_id:ids.settings}); await db.collection('ad_placements').deleteOne({_id:ids.placement});
  report.cleanup=true; await writeFile('docs/quality/guide-runs/oct19-browser-local-latest.json',JSON.stringify(report,null,2)+'\n'); await browser.close(); await safari.close(); await db.close(); console.log(JSON.stringify(report));
}
