import fs from 'node:fs';

const enumSchema = { type: 'string', enum: ['ready_to_move', 'under_construction', 'future_delivery'] };
const openapiPath = 'apps/api/openapi/openapi.json';
const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
openapi.components.schemas.PropertyDeliveryStatus = enumSchema;
openapi.components.schemas.PublicHomepageCategory = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'slug', 'name', 'propertyCount', 'order'],
  properties: {
    id: { type: 'string', pattern: '^[a-f0-9]{24}$' },
    slug: { type: 'string', minLength: 2, maxLength: 120, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
    name: { '$ref': '#/components/schemas/LocalizedText' },
    imageUrl: { type: 'string', format: 'uri', maxLength: 2048 },
    propertyCount: { type: 'integer', minimum: 0 },
    order: { type: 'integer', minimum: 0, maximum: 100000 }
  }
};
openapi.components.schemas.PropertyDetailsStep.properties.deliveryStatus = { oneOf: [{ '$ref': '#/components/schemas/PropertyDeliveryStatus' }, { type: 'null' }] };
openapi.components.schemas.PropertyData.properties.deliveryStatus = { '$ref': '#/components/schemas/PropertyDeliveryStatus' };
openapi.components.schemas.PublicPropertyListItem = { allOf: [
  { '$ref': '#/components/schemas/PublicHomepageProperty' },
  { type: 'object', properties: {
    locationName: { '$ref': '#/components/schemas/LocalizedText' },
    sourceName: { '$ref': '#/components/schemas/LocalizedText' },
    sourceImageUrl: { type: 'string', format: 'uri', maxLength: 2048 },
    sourceType: { type: 'string', enum: ['brokerage_office', 'developer_company'] },
    publicCode: { type: 'string', minLength: 2, maxLength: 80, pattern: '^[A-Za-z0-9_-]+$' },
    viewCount: { type: 'integer', minimum: 0 },
    installmentAvailable: { type: 'boolean' },
    featured: { type: 'boolean' },
    deliveryStatus: { '$ref': '#/components/schemas/PropertyDeliveryStatus' }
  } }
] };
const listData = openapi.components.schemas.PublicPropertyListData;
listData.required = [...new Set([...(listData.required ?? []), 'categories'])];
listData.properties.items.items = { '$ref': '#/components/schemas/PublicPropertyListItem' };
listData.properties.categories = { type: 'array', maxItems: 100, items: { '$ref': '#/components/schemas/PublicHomepageCategory' } };
listData.required = [...new Set([...(listData.required ?? []), 'propertyTypes'])];
listData.properties.propertyTypes = { type: 'array', maxItems: 100, items: { '$ref': '#/components/schemas/PublicHomepageCategory' } };
const parameters = openapi.paths['/api/v1/public/properties'].get.parameters;
for (const name of ['propertyCategoryId', 'propertyTypeId', 'deliveryStatus']) {
  const schema = name === 'deliveryStatus' ? { '$ref': '#/components/schemas/PropertyDeliveryStatus' } : { type: 'string', pattern: '^[a-f0-9]{24}$' };
  const existing = parameters.find(parameter => parameter.name === name);
  if (existing) existing.schema = schema; else parameters.splice(2, 0, { name, in: 'query', schema });
}
fs.writeFileSync(openapiPath, `${JSON.stringify(openapi, null, 2)}\n`);

const postmanPath = 'apps/api/postman/Sadat-Real-Estate.postman_collection.json';
const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));
const visit = items => { for (const item of items ?? []) { if (item.request?.url?.raw?.includes('/public/properties?')) { item.request.url.raw = '{{apiV1BaseUrl}}/public/properties?deliveryStatus=ready_to_move&sort=publishedAt&direction=desc&page=1&limit=20'; item.request.url.query = [{ key: 'deliveryStatus', value: 'ready_to_move' }, { key: 'sort', value: 'publishedAt' }, { key: 'direction', value: 'desc' }, { key: 'page', value: '1' }, { key: 'limit', value: '20' }]; } visit(item.item); } };
visit(postman.item);
fs.writeFileSync(postmanPath, `${JSON.stringify(postman, null, 2)}\n`);

const blueprintPath = 'agent_pack/01_product/API_ENDPOINT_BLUEPRINT.json';
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
const endpoint = blueprint.find(item => item.method === 'GET' && item.path === '/api/v1/public/properties');
if (!endpoint) throw new Error('Public listing blueprint missing');
endpoint.purpose = 'Published listing/search with taxonomy and delivery-status filters';
fs.writeFileSync(blueprintPath, `${JSON.stringify(blueprint, null, 2)}\n`);
console.log(JSON.stringify({ openapi: true, postman: true, apiInventory: true }, null, 2));
