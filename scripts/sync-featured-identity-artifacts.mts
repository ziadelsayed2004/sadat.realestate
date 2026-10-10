import fs from 'node:fs';
import { z } from 'zod';
import * as contracts from '@sadat-real-estate/contracts';

const openApiPath = 'apps/api/openapi/openapi.json', postmanPath = 'apps/api/postman/Sadat-Real-Estate.postman_collection.json';
const openApi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
const schema = (value: z.ZodType) => { const { $schema: _schema, ...result } = z.toJSONSchema(value, { unrepresentable: 'any' }); void _schema; return result; };
const schemas: Record<string, z.ZodType> = {
  Article: contracts.articleSchema, ArticleCreate: contracts.articleCreateSchema, ArticlePatch: contracts.articlePatchSchema, ArticlePublic: contracts.articlePublicSchema, ArticleDraftBody: contracts.articleDraftBodySchema,
  ArticlePublicSuccessEnvelope: contracts.articlePublicSuccessEnvelopeSchema, ArticlePublicListSuccessEnvelope: contracts.articlePublicListSuccessEnvelopeSchema,
  AdBanner: contracts.adBannerSchema, AdBannerCreate: contracts.adBannerCreateSchema, AdBannerPatch: contracts.adBannerPatchSchema,
  FeaturedCreative: contracts.featuredCreativeSchema, FeaturedOptions: contracts.featuredOptionsSchema,
  FeaturedOptionsSuccessEnvelope: contracts.featuredOptionsSuccessEnvelopeSchema, PublicHomepageBanner: contracts.publicHomepageBannerSchema,
  PublicIdentitySubscription: contracts.publicIdentitySubscriptionSchema, PublicIdentitySubscriptionPut: contracts.publicIdentitySubscriptionPutSchema,
  PublicIdentitySubscriptionSuccessEnvelope: contracts.publicIdentitySubscriptionSuccessEnvelopeSchema,
  RequestData: contracts.requestDataSchema, RbacPermission: contracts.rbacPermissionSchema,
  ViewingData: contracts.viewingDataSchema
};
for (const [name, value] of Object.entries(schemas)) openApi.components.schemas[name] = schema(value);
for (const [path, name] of [['/api/v1/public/articles/{slug}', 'ArticlePublicSuccessEnvelope'], ['/api/v1/public/articles', 'ArticlePublicListSuccessEnvelope']]) {
  openApi.paths[path].get.responses['200'].content['application/json'].schema = { $ref: `#/components/schemas/${name}` };
}
// Keep inline response schemas in sync as well as named schemas.
function visit(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  const object = value as Record<string, unknown>;
  const properties = object.properties as Record<string, unknown> | undefined;
  if (properties?.id && properties.seekerId && properties.requestedAt && properties.customerName) { Object.assign(object, schema(contracts.viewingDataSchema)); return; }
  for (const child of Object.values(object)) visit(child);
}
visit(openApi.paths);
const reference = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const providerPath = '/api/v1/admin/providers/{providerId}/public-identity-subscription';
const operation = (operationId: string, summary: string, response: unknown, body?: string, parameters: unknown[] = []) => ({
  operationId, summary, security: [{ bearerAuth: [] }], ...(parameters.length ? { parameters } : {}),
  ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: reference(body) } } } } : {}),
  responses: { '200': { description: 'Successful authorized response', content: { 'application/json': { schema: response } } }, '400': { $ref: '#/components/responses/ValidationError' }, '401': { $ref: '#/components/responses/AuthError' }, '403': { $ref: '#/components/responses/AuthError' }, '404': { description: 'Account or destination unavailable' }, '409': { description: 'Expected version is stale' } }
});
const providerParameter = { name: 'providerId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } };
openApi.paths[providerPath] = {
  get: operation('getProviderPublicIdentitySubscription', 'Read office identity subscription; requires admin:providers.view', reference('PublicIdentitySubscriptionSuccessEnvelope'), undefined, [providerParameter]),
  put: operation('updateProviderPublicIdentitySubscription', 'Confirm external payment and activate, renew or stop office identity; requires admin:providers.visibility.manage and optimistic version', reference('PublicIdentitySubscriptionSuccessEnvelope'), 'PublicIdentitySubscriptionPut', [providerParameter])
};
openApi.paths['/api/v1/admin/banners/featured-options'] = { get: operation('getFeaturedBannerOptions', 'List eligible advertisers and their own published internal destinations; requires admin:banners.view', reference('FeaturedOptionsSuccessEnvelope'), undefined, [{ name: 'providerId', in: 'query', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } }]) };
openApi.paths['/api/v1/admin/banners/featured-import'] = { post: operation('importLegacyFeaturedBanners', 'Idempotently import legacy cards as unlinked drafts for review; requires admin:banners.manage', { type: 'object', properties: { data: { type: 'object', properties: { imported: { type: 'boolean' } }, required: ['imported'] }, requestId: { type: 'string' } }, required: ['data'] }) };
for (const [path, operations] of Object.entries(openApi.paths) as [string, Record<string, { operationId?: string }> ][]) {
  // Runtime operation IDs are stable, including the two provider subscription routes.
  if (path === providerPath) { operations.get!.operationId = 'getProviderIdentitySubscription'; operations.put!.operationId = 'putProviderIdentitySubscription'; }
}
const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));
const folderName = 'Featured homepage ads and office identity';
postman.item = postman.item.filter((item: { name: string }) => item.name !== folderName);
const request = (name: string, method: string, path: string, body?: unknown) => ({ name, request: { method, header: [{ key: 'Authorization', value: 'Bearer {{adminAccessToken}}' }, ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : [])], url: { raw: `{{apiV1BaseUrl}}${path}`, ...(path.includes(':providerId') ? { variable: [{ key: 'providerId', value: '000000000000000000000000', type: 'string' }] } : {}) }, ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}) } });
postman.item.push({ name: folderName, item: [
  request('Read office identity subscription', 'GET', '/admin/providers/:providerId/public-identity-subscription'),
  request('Set paid office identity period', 'PUT', '/admin/providers/:providerId/public-identity-subscription', { status: 'active', paymentConfirmed: true, startAt: '2026-10-10T00:00:00Z', endAt: '2026-11-10T00:00:00Z', expectedVersion: 0 }),
  request('List eligible advertisers and owned destinations', 'GET', '/admin/banners/featured-options?providerId={{providerId}}'),
  request('Import legacy cards as reviewable drafts', 'POST', '/admin/banners/featured-import', {})
] });
fs.writeFileSync(openApiPath, `${JSON.stringify(openApi, null, 2)}\n`);
fs.writeFileSync(postmanPath, `${JSON.stringify(postman, null, 2)}\n`);
