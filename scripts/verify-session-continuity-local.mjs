import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import mongoose from 'mongoose';
import {chromium,webkit,expect} from '@playwright/test';
import {createAuthRuntime} from '../apps/api/dist/modules/auth/runtime.js';
import {createAuthModels} from '../apps/api/dist/modules/auth/models.js';
import {createArgon2PasswordHasher} from '../apps/api/dist/modules/auth/crypto.js';
import {createIdentityModels} from '../apps/api/dist/modules/identity/models.js';
import {createPublicRuntime} from '../apps/api/dist/modules/public/runtime.js';
import {createApiServer,startApiServer,stopApiServer} from '../apps/api/dist/server.js';

// Real short-lived signed tokens, cookie rotation and isolated MongoDB; no API mocks.
const name=`continuity_${randomUUID().replaceAll('-','')}`, base='http://127.0.0.1:4181';
const connection=await mongoose.createConnection(`mongodb://127.0.0.1:27018/${name}?replicaSet=rs0`).asPromise();
const report={status:'RUNNING',mockedRoutes:false,accessTokenSeconds:6,checks:[],cleanup:false};let server,web,browser;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  const identity=createIdentityModels(connection), credentials=createAuthModels(connection);
  await Promise.all([identity.User.init(),identity.Session.init(),credentials.AdminCredential.init()]);
  const password=randomBytes(20).toString('hex'), hash=await createArgon2PasswordHasher().hash(password);
  const auth=createAuthRuntime(connection,{accessTokenSecret:randomBytes(32),accessTokenTtlSeconds:6,refreshTokenTtlSeconds:3600,otpProviderMode:'unconfigured',cookie:{name:'sadat_refresh',path:'/api/v1/auth',httpOnly:true,sameSite:'Strict',secure:false,maxAgeSeconds:3600}});
  server=createApiServer({database:{isReady:async()=>true},auth,publicHomepage:createPublicRuntime(connection,auth.accessTokens),security:{rateLimit:{max:5000}},observability:{logger:{log(){}}}});
  const address=await startApiServer(server,{host:'127.0.0.1',port:0});
  web=spawn(process.execPath,['apps/web/server.mjs','--mode','production'],{windowsHide:true,stdio:'ignore',env:{...process.env,WEB_PORT:'4181',WEB_HOST:'127.0.0.1',WEB_API_ORIGIN:`http://127.0.0.1:${address.port}`,WEB_PUBLIC_ORIGIN:base}});
  for(let attempt=0;attempt<100;attempt++){try{if((await fetch(base+'/health')).ok)break;}catch{/* Starting. */}await pause(100);}
  for(const roleType of ['provider','seeker','admin']){
    const user=await identity.User.create({normalizedEmail:`${roleType}@example.invalid`,roleType,status:'verified'});
    await credentials.AdminCredential.create({userId:user._id,passwordHash:hash,passwordChangedAt:new Date()});
    for(const engine of [chromium,webkit]){
      browser=await engine.launch();const context=await browser.newContext({viewport:{width:1440,height:900}});
      try{
        const r=await context.request.post(base+'/api/v1/auth/login',{data:{email:user.normalizedEmail,password}});assert.equal(r.status(),200);const initial=(await r.json()).data;
        await context.addInitScript(()=>window.localStorage.setItem('sadat-real-estate.auth.session-hint','authenticated'));
        const pages=[await context.newPage(),await context.newPage()], refreshed=[],errors=[];
        for(const page of pages){page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(new URL(r.url()).pathname==='/api/v1/auth/refresh')refreshed.push(r.status());});}
        await Promise.all(pages.map(async page=>{await page.goto(base+'/?lang=en');await expect(page.locator('.public-homepage__account').last()).toHaveAttribute('href',new RegExp(`^/${roleType}`));}));
        await pause(13_000);
        assert.throws(()=>auth.accessTokens.verify(initial.accessToken));assert(refreshed.filter(status=>status===200).length>=4,JSON.stringify(refreshed));assert(!refreshed.includes(401));
        for(const page of pages)await expect(page.locator('.public-homepage__account').last()).toBeVisible();
        await context.setOffline(true);await pause(8_000);
        for(const page of pages)await expect(page.locator('.public-homepage__account').last()).toBeVisible();
        const count=refreshed.filter(status=>status===200).length;await context.setOffline(false);
        for(const page of pages)await page.evaluate(()=>window.dispatchEvent(new window.Event('online')));
        await expect.poll(()=>refreshed.filter(status=>status===200).length).toBeGreaterThan(count);
        await pages[0].reload();await expect(pages[0].locator('.public-homepage__account').last()).toBeVisible();
        assert(!refreshed.includes(401));assert.deepEqual(errors,[]);
        await pages[1].close();const logout=await context.request.post(base+'/api/v1/auth/logout',{data:{}});assert.equal(logout.status(),200);
        await pages[0].reload();await expect(pages[0].locator('.public-homepage__login').last()).toBeVisible();
        report.checks.push(`${engine.name()} ${roleType}: two tabs survive several real token expirations, cookie rotations, offline outage and reload; explicit logout still works`);
      }finally{await context.close();await browser.close();browser=undefined;}
    }
  }
  report.status='PASS_LOCAL';
}catch(e){report.status='FAIL_LOCAL';report.error=String(e.stack??e);process.exitCode=1;}
finally{
  await browser?.close();if(web&&web.exitCode===null){const stopped=once(web,'exit');web.kill();await stopped;}if(server)await stopApiServer(server);
  assert.equal(connection.name,name);assert.match(name,/^continuity_[a-f0-9]{32}$/u);await connection.dropDatabase();report.cleanup=(await connection.db.listCollections().toArray()).length===0;await connection.close();
  await writeFile('docs/quality/guide-runs/session-continuity-local-latest.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
