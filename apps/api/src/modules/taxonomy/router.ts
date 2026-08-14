import { Router, type Request, type Response } from 'express';
import { taxonomyCreateSchema, taxonomyDeleteSchema, taxonomyListQuerySchema, taxonomyParamsSchema, taxonomyPatchSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { toSuccessResponse } from '../contracts/response.js';
import { getRequestContext } from '../observability/context.js';
import { createAdminRbacAuthMiddleware } from '../rbac/auth.js';
import { TaxonomyError, type TaxonomyService } from './module.js';

export const TAXONOMY_ROUTE_DEFINITIONS=[
  {method:'GET',path:'/api/v1/admin/property-categories',operationId:'listPropertyTaxonomy'},
  {method:'POST',path:'/api/v1/admin/property-categories',operationId:'createPropertyTaxonomy'},
  {method:'PATCH',path:'/api/v1/admin/property-categories/:categoryId',operationId:'updatePropertyTaxonomy'},
  {method:'DELETE',path:'/api/v1/admin/property-categories/:categoryId',operationId:'deletePropertyTaxonomy'}
] as const;
export interface TaxonomyRouterDependencies{service:TaxonomyService;accessTokens:AccessTokenService}
const errors={TAXONOMY_FORBIDDEN:[403,'errors.taxonomy.forbidden'],TAXONOMY_NOT_FOUND:[404,'errors.taxonomy.notFound'],TAXONOMY_CATEGORY_NOT_FOUND:[409,'errors.taxonomy.categoryNotFound'],TAXONOMY_PARENT_INVALID:[409,'errors.taxonomy.parentInvalid'],TAXONOMY_SLUG_EXISTS:[409,'errors.taxonomy.slugExists'],TAXONOMY_VERSION_CONFLICT:[409,'errors.taxonomy.versionConflict'],TAXONOMY_IN_USE:[409,'errors.taxonomy.inUse']} as const;
function context(r:Request){const c=getRequestContext();return{requestId:c?.requestId??r.get('x-request-id')??'unknown-request',traceId:c?.traceId??'unknown-trace'};}
function principal(r:Response){return{userId:(r.locals.adminRbacClaims as AccessTokenClaims).sub};}
function fail(req:Request,res:Response,e:unknown){const t=e instanceof TaxonomyError?errors[e.code]:undefined;const c=context(req);const m=toApiErrorResponse(t?new ApiContractError((e as TaxonomyError).code,t[1],t[0]):e,c.requestId);res.status(m.statusCode).json(m.body);}
export function createTaxonomyRouter(d:TaxonomyRouterDependencies){const r=Router();r.use('/admin/property-categories',(_q,s,n)=>{s.setHeader('Cache-Control','no-store');n();});r.use('/admin/property-categories',createAdminRbacAuthMiddleware(d.accessTokens));
  r.get('/admin/property-categories',async(q,s)=>{try{const x=await d.service.list(principal(s),taxonomyListQuerySchema.parse(q.query));s.status(200).json(toSuccessResponse(x.data,context(q).requestId,{page:x.page,limit:x.limit,total:x.total}));}catch(e){fail(q,s,e);}});
  r.post('/admin/property-categories',async(q,s)=>{try{const c=context(q);s.status(201).json(toSuccessResponse(await d.service.create(principal(s),taxonomyCreateSchema.parse(q.body??{}),c),c.requestId));}catch(e){fail(q,s,e);}});
  r.patch('/admin/property-categories/:categoryId',async(q,s)=>{try{const{id}= {id:taxonomyParamsSchema.parse(q.params).categoryId};const c=context(q);s.status(200).json(toSuccessResponse(await d.service.update(principal(s),id,taxonomyPatchSchema.parse(q.body??{}),c),c.requestId));}catch(e){fail(q,s,e);}});
  r.delete('/admin/property-categories/:categoryId',async(q,s)=>{try{const id=taxonomyParamsSchema.parse(q.params).categoryId;const c=context(q);s.status(200).json(toSuccessResponse(await d.service.delete(principal(s),id,taxonomyDeleteSchema.parse(q.body??{}),c),c.requestId));}catch(e){fail(q,s,e);}});return r;}
