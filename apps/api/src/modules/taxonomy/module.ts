import type { RbacPermission, TaxonomyCreate, TaxonomyData, TaxonomyDelete, TaxonomyPatch, TaxonomyQuery } from '@sadat-real-estate/contracts';
import { taxonomyCreateSchema, taxonomyDeleteSchema, taxonomyIdSchema, taxonomyListQuerySchema, taxonomyPatchSchema } from '@sadat-real-estate/contracts';

export type StoredTaxonomy = Omit<TaxonomyData, 'availableActions' | 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date };
export type Write = { kind: 'written'; item: StoredTaxonomy } | { kind: 'slug_conflict' | 'not_found' | 'version_conflict' };
export type Removed = { kind: 'deleted' | 'not_found' | 'version_conflict' | 'in_use' };
export interface TaxonomyStore {
  list(query: TaxonomyQuery): Promise<{ items: StoredTaxonomy[]; total: number }>;
  find(id: string): Promise<StoredTaxonomy | null>;
  categoryExists(id: string): Promise<boolean>;
  create(value: Omit<StoredTaxonomy, 'id' | 'version' | 'createdAt' | 'updatedAt'>, meta: Meta): Promise<Write>;
  update(id: string, version: number, changes: Partial<StoredTaxonomy>, before: StoredTaxonomy, meta: Meta): Promise<Write>;
  delete(id: string, version: number, before: StoredTaxonomy, meta: Meta): Promise<Removed>;
}
export interface Meta { actorId: string; reason: string; requestId: string; traceId: string; at: Date }
export interface TaxonomyAuthorization { authorize(id: string, permission: RbacPermission): Promise<boolean> }
export class TaxonomyError extends Error { constructor(readonly code: 'TAXONOMY_FORBIDDEN'|'TAXONOMY_NOT_FOUND'|'TAXONOMY_CATEGORY_NOT_FOUND'|'TAXONOMY_PARENT_INVALID'|'TAXONOMY_SLUG_EXISTS'|'TAXONOMY_VERSION_CONFLICT'|'TAXONOMY_IN_USE') { super(code); } }
export interface TaxonomyService {
  list(p: {userId:string}, q: TaxonomyQuery): Promise<{data:{items:TaxonomyData[]};page:number;limit:number;total:number}>;
  create(p:{userId:string}, i:TaxonomyCreate, c:{requestId:string;traceId:string}):Promise<TaxonomyData>;
  update(p:{userId:string}, id:string, i:TaxonomyPatch, c:{requestId:string;traceId:string}):Promise<TaxonomyData>;
  delete(p:{userId:string}, id:string, i:TaxonomyDelete, c:{requestId:string;traceId:string}):Promise<{id:string;deleted:true}>;
}
export function createTaxonomyService(d:{store:TaxonomyStore;authorization:TaxonomyAuthorization;now?:()=>Date}):TaxonomyService {
  const now=d.now??(()=>new Date());
  const can=(id:string,p:RbacPermission)=>d.authorization.authorize(id,p);
  const requirePermission=async(id:string,p:RbacPermission)=>{if(!await can(id,p))throw new TaxonomyError('TAXONOMY_FORBIDDEN');};
  const output=(x:StoredTaxonomy,manage:boolean):TaxonomyData=>({...x,createdAt:x.createdAt.toISOString(),updatedAt:x.updatedAt.toISOString(),availableActions:manage?['update','delete']:[]});
  const unwrap=(r:Write):StoredTaxonomy=>{if(r.kind==='written')return r.item;if(r.kind==='slug_conflict')throw new TaxonomyError('TAXONOMY_SLUG_EXISTS');if(r.kind==='not_found')throw new TaxonomyError('TAXONOMY_NOT_FOUND');throw new TaxonomyError('TAXONOMY_VERSION_CONFLICT');};
  const meta=(p:{userId:string},reason:string,c:{requestId:string;traceId:string}):Meta=>({actorId:p.userId,reason,...c,at:now()});
  return {
    async list(p,q0){const q=taxonomyListQuerySchema.parse(q0);await requirePermission(p.userId,'admin:taxonomy.view');const manage=await can(p.userId,'admin:taxonomy.manage');const r=await d.store.list(q);return{data:{items:r.items.map(x=>output(x,manage))},page:q.page,limit:q.limit,total:r.total};},
    async create(p,i0,c){const i=taxonomyCreateSchema.parse(i0);await requirePermission(p.userId,'admin:taxonomy.manage');if(i.categoryId&&!await d.store.categoryExists(i.categoryId))throw new TaxonomyError('TAXONOMY_CATEGORY_NOT_FOUND');return output(unwrap(await d.store.create({kind:i.kind,name:i.name,slug:i.slug,order:i.order,active:i.active,...(i.categoryId?{categoryId:i.categoryId}:{})},meta(p,i.reason,c))),true);},
    async update(p,id,i0,c){taxonomyIdSchema.parse(id);const i=taxonomyPatchSchema.parse(i0);await requirePermission(p.userId,'admin:taxonomy.manage');const before=await d.store.find(id);if(!before)throw new TaxonomyError('TAXONOMY_NOT_FOUND');if(i.categoryId){if(before.kind!=='type'||i.categoryId===id)throw new TaxonomyError('TAXONOMY_PARENT_INVALID');if(!await d.store.categoryExists(i.categoryId))throw new TaxonomyError('TAXONOMY_CATEGORY_NOT_FOUND');}const changes:Partial<StoredTaxonomy>={...(i.categoryId!==undefined?{categoryId:i.categoryId}:{}),...(i.name!==undefined?{name:i.name}:{}),...(i.slug!==undefined?{slug:i.slug}:{}),...(i.order!==undefined?{order:i.order}:{}),...(i.active!==undefined?{active:i.active}:{})};return output(unwrap(await d.store.update(id,i.version,changes,before,meta(p,i.reason,c))),true);},
    async delete(p,id,i0,c){taxonomyIdSchema.parse(id);const i=taxonomyDeleteSchema.parse(i0);await requirePermission(p.userId,'admin:taxonomy.manage');const before=await d.store.find(id);if(!before)throw new TaxonomyError('TAXONOMY_NOT_FOUND');const r=await d.store.delete(id,i.version,before,meta(p,i.reason,c));if(r.kind==='not_found')throw new TaxonomyError('TAXONOMY_NOT_FOUND');if(r.kind==='version_conflict')throw new TaxonomyError('TAXONOMY_VERSION_CONFLICT');if(r.kind==='in_use')throw new TaxonomyError('TAXONOMY_IN_USE');return{id,deleted:true};}
  };
}
