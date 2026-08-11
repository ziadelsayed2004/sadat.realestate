import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { OPERATIONAL_ROUTE_DEFINITIONS } from '../../src/modules/database/health.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const expected = OPERATIONAL_ROUTE_DEFINITIONS.map((route) => `${route.method} ${route.path}`).sort();

test('OpenAPI and Postman contain exactly the implemented operational routes', () => {
  const openApi = JSON.parse(fs.readFileSync(path.join(apiRoot, 'openapi/openapi.json'), 'utf8')) as { paths: Record<string, { get?: unknown }> };
  const postman = JSON.parse(fs.readFileSync(path.join(apiRoot, 'postman/Sadat-Real-Estate.postman_collection.json'), 'utf8')) as { item: Array<{ request: { method: string; url: { raw: string } } }> };
  const openApiRoutes = Object.entries(openApi.paths).filter(([, definition]) => definition.get).map(([route]) => `GET ${route}`).sort();
  const postmanRoutes = postman.item.map((item) => `${item.request.method} ${item.request.url.raw.match(/\/(health|ready)$/)?.[0] ?? ''}`).sort();
  assert.deepEqual(openApiRoutes, expected);
  assert.deepEqual(postmanRoutes, expected);
});
