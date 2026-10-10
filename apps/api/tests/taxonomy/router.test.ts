import assert from 'node:assert/strict';import test from 'node:test';
import { Readable } from 'node:stream';
import type {AccessTokenClaims,AccessTokenService} from '../../src/modules/auth/crypto.js';import type {TaxonomyService} from '../../src/modules/taxonomy/module.js';import {TaxonomyError} from '../../src/modules/taxonomy/module.js';import {createApiServer,startApiServer,stopApiServer} from '../../src/server.js';
const admin='0123456789abcdef01234567',viewer='1123456789abcdef01234567',id='2123456789abcdef01234567';
const tokens:AccessTokenService={issue(){return'unused'},verify(t){if(t==='bad')throw Error();const role=t==='seeker'?'seeker':'admin';return{iss:'sadat-real-estate-api',aud:'sadat-real-estate',sub:t==='viewer'?viewer:admin,sid:'3123456789abcdef01234567',role,status:'verified',iat:1,exp:2,jti:'x'} as AccessTokenClaims}};
const item=()=>({id,kind:'category' as const,name:{en:'Residential'},slug:'residential',order:0,active:true,version:0,createdAt:'2026-08-14T08:00:00.000Z',updatedAt:'2026-08-14T08:00:00.000Z',availableActions:['update','delete'] as ('update'|'delete')[]});
const service:TaxonomyService={async list(p,q){if(p.userId===viewer)throw new TaxonomyError('TAXONOMY_FORBIDDEN');return{data:{items:[item()]},page:q.page,limit:q.limit,total:1}},async create(){return item()},async update(_p,x,i){if(x!==id)throw new TaxonomyError('TAXONOMY_NOT_FOUND');return{...item(),active:i.active??true}},async delete(_p,x,i){if(i.reason==='Referenced item')throw new TaxonomyError('TAXONOMY_IN_USE');return{id:x,deleted:true}}};
async function run(fn:(url:string)=>Promise<void>){const s=createApiServer({database:{isReady:async()=>true},taxonomy:{service,accessTokens:tokens}});const a=await startApiServer(s,{host:'127.0.0.1',port:0});try{await fn(`http://127.0.0.1:${a.port}`)}finally{await stopApiServer(s)}}
const req=(u:string,m:string,p:string,t:string,b?:unknown)=>fetch(u+p,{method:m,headers:{Authorization:`Bearer ${t}`,...(b?{'Content-Type':'application/json'}:{})},...(b?{body:JSON.stringify(b)}:{})});
test('enforces authentication, role, permission, and strict requests',async()=>run(async u=>{assert.equal((await fetch(u+'/api/v1/admin/property-categories')).status,401);assert.equal((await req(u,'GET','/api/v1/admin/property-categories','seeker')).status,403);assert.equal((await req(u,'GET','/api/v1/admin/property-categories','viewer')).status,403);assert.equal((await req(u,'GET','/api/v1/admin/property-categories?limit=101','admin')).status,400);assert.equal((await req(u,'POST','/api/v1/admin/property-categories','admin',{kind:'category',name:{en:'X'},slug:'Bad',reason:'Invalid request',extra:true})).status,400);}));
test('lists, creates, updates, and guards referenced deletion',async()=>run(async u=>{assert.equal((await req(u,'GET','/api/v1/admin/property-categories','admin')).status,200);assert.equal((await req(u,'POST','/api/v1/admin/property-categories','admin',{kind:'category',name:{en:'Residential'},slug:'residential',reason:'Create category'})).status,201);assert.equal((await req(u,'PATCH',`/api/v1/admin/property-categories/${id}`,'admin',{version:0,active:false,reason:'Deactivate category'})).status,200);assert.equal((await req(u,'DELETE',`/api/v1/admin/property-categories/${id}`,'admin',{version:0,reason:'Referenced item'})).status,409);}));
test('routes authenticated binary uploads and previews separately from public photo access', async () => {
  const photos = {
    async validateAttach() {},
    async upload(claims: AccessTokenClaims, source: AsyncIterable<Uint8Array>, mime: string) {
      assert.equal(claims.sub, admin); assert.equal(mime, 'image/png');
      const chunks: Uint8Array[] = []; for await (const chunk of source) chunks.push(chunk);
      assert.equal(Buffer.concat(chunks).toString(), 'photo-bytes');
      return { id, imageUrl: `/api/v1/public/taxonomy-photos/${id}` };
    },
    async open(assetId: string, claims?: AccessTokenClaims) {
      assert.equal(assetId, id); if (claims) assert.equal(claims.sub, admin);
      return { mime: 'image/webp', stream: Readable.from('scanned-image') };
    }
  };
  const server = createApiServer({ database: { isReady: async () => true }, taxonomy: { service, accessTokens: tokens, photos } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const url = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${url}/api/v1/admin/property-categories/photos`, { method: 'POST' })).status, 401);
    assert.equal((await req(url, 'POST', '/api/v1/admin/property-categories/photos', 'seeker')).status, 403);
    const uploaded = await fetch(`${url}/api/v1/admin/property-categories/photos`, { method: 'POST', headers: { authorization: 'Bearer admin', 'content-type': 'image/png' }, body: 'photo-bytes' });
    assert.equal(uploaded.status, 201); assert.equal((await uploaded.json()).data.imageUrl, `/api/v1/public/taxonomy-photos/${id}`);
    for (const path of [`/api/v1/admin/property-categories/photos/${id}`, `/api/v1/public/taxonomy-photos/${id}`]) {
      const response = await fetch(url + path, { headers: path.includes('/admin/') ? { authorization: 'Bearer admin' } : {} });
      assert.equal(response.status, 200); assert.match(response.headers.get('content-type')!, /^image\/webp/);
      assert.equal(await response.text(), 'scanned-image'); assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  } finally { await stopApiServer(server); }
});
