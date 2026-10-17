import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import {chromium,webkit,expect}from'@playwright/test';
const env=Object.fromEntries((await readFile('.env.local','utf8')).split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const at=l.indexOf('=');return[l.slice(0,at),l.slice(at+1).replace(/^['"]|['"]$/g,'')];}));assert(env.MONGODB_URI.includes(':27018/'));
const db=await mongoose.createConnection(env.MONGODB_URI).asPromise(),chrome=await chromium.launch(),safari=await webkit.launch(),base='http://127.0.0.1:4173',email=`oct17-new-provider-${Date.now()}@example.invalid`,password='Fresh-Provider!2026',report={status:'FAIL_LOCAL',checks:[],mockedResponses:false,cleanup:false};let id;
try{
 const ctx=await safari.newContext({viewport:{width:390,height:844},isMobile:true}),page=await ctx.newPage();
 await page.goto(base+'/auth/register/provider/type?lang=en');await page.locator('[data-provider-type="developer_company"]').click();await page.locator('#provider-registration-password').fill(password);await page.locator('#provider-registration-password-confirmation').fill(password);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#auth-otp-email').fill(email);await page.getByRole('button',{name:'Send code',exact:true}).click();
 let code;await expect.poll(async()=>{const box=await(await fetch('http://127.0.0.1:8025/api/messages')).json();code=box.messages.find(m=>m.to.includes(email))?.raw.replace(/=\r?\n/g,'').match(/\b(\d{6})\b/u)?.[1];return !!code;}).toBe(true);
 await page.locator('.auth-otp__digit').first().fill(code);const registered=page.waitForResponse(r=>r.url().endsWith('/provider/application')&&r.request().method()==='POST');await page.getByRole('button',{name:'Verify code',exact:true}).click();const response=await registered;assert.equal(response.status(),201);id=new mongoose.Types.ObjectId((await response.json()).data.session.user.id);report.checks.push('fresh_developer_email_otp_registration_password_retained_webkit');
 for(const engine of [chrome,safari]){
  const context=await engine.newContext({viewport:{width:390,height:844}}),p=await context.newPage();await p.goto(base+'/auth/login?lang=en');await p.locator('#auth-login-email').fill(email.toUpperCase());await p.locator('#auth-login-password').fill(password);const signed=p.waitForResponse(r=>r.url().endsWith('/auth/login')&&r.request().method()==='POST');await p.getByRole('button',{name:'Log in',exact:true}).click();const login=await signed;assert.equal(login.status(),200);await expect(p).not.toHaveURL(/auth\/login/);await context.close();
 }
 report.checks.push('new_developer_password_login_in_independent_chromium_and_webkit_sessions');report.status='PASS_LOCAL';
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}
finally{
 const row=await db.collection('users').findOne({normalizedEmail:email});id??=row?._id;if(id){for(const col of ['sessions','admin_credentials','provider_profiles','provider_applications'])await db.collection(col).deleteMany({userId:id});await db.collection('users').deleteOne({_id:id});}await db.collection('otp_challenges').deleteMany({normalizedEmail:email});report.cleanup=true;await writeFile('docs/quality/guide-runs/client-followups-provider-auth-local-latest.json',JSON.stringify(report,null,2)+'\n');await chrome.close();await safari.close();await db.close();console.log(JSON.stringify(report));
}
