import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  collectOpenApiRoutes,
  collectPostmanRoutes,
  IMPLEMENTED_ROUTE_DEFINITIONS
} from '../../src/modules/docs/api-artifacts.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const expected = IMPLEMENTED_ROUTE_DEFINITIONS.map((route) => `${route.method} ${route.path}`).sort();

test('OpenAPI and Postman contain exactly the implemented runtime routes', () => {
  const openApi = JSON.parse(fs.readFileSync(path.join(apiRoot, 'openapi/openapi.json'), 'utf8'));
  const postman = JSON.parse(fs.readFileSync(path.join(apiRoot, 'postman/Sadat-Real-Estate.postman_collection.json'), 'utf8'));
  assert.deepEqual(collectOpenApiRoutes(openApi), expected);
  assert.deepEqual(collectPostmanRoutes(postman), expected);
});
