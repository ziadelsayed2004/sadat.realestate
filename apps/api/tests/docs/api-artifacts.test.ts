import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  collectOpenApiRoutes,
  collectPostmanRoutes,
  PRODUCT_API_BASE_PATH,
  validateApiArtifacts,
  validateOpenApiDocument,
  validatePostmanCollection,
  validatePostmanEnvironment,
  IMPLEMENTED_ROUTE_DEFINITIONS
} from '../../src/modules/docs/api-artifacts.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');

function readJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(apiRoot, relativePath), 'utf8'));
}

function loadArtifacts() {
  return {
    openApi: readJson('openapi/openapi.json'),
    postmanCollection: readJson('postman/Sadat-Real-Estate.postman_collection.json'),
    postmanEnvironment: readJson('postman/Sadat-Real-Estate.local.postman_environment.json')
  };
}

test('current OpenAPI and Postman artifacts match only implemented runtime routes', () => {
  const artifacts = loadArtifacts();
  const expected = IMPLEMENTED_ROUTE_DEFINITIONS
    .map((route) => `${route.method} ${route.path}`)
    .sort();
  assert.deepEqual(validateApiArtifacts(artifacts), []);
  assert.deepEqual(collectOpenApiRoutes(artifacts.openApi), expected);
  assert.deepEqual(collectPostmanRoutes(artifacts.postmanCollection), expected);
});

test('OpenAPI 3.1 declares the future product base without prefixing operational probes', () => {
  const openApi = loadArtifacts().openApi as Record<string, unknown>;
  assert.equal(openApi.openapi, '3.1.0');
  assert.equal(openApi['x-product-api-base-path'], PRODUCT_API_BASE_PATH);
  assert.deepEqual(validateOpenApiDocument(openApi), []);
  assert.equal(
    collectOpenApiRoutes(openApi).filter((route) => route.includes('/api/v1/')).length,
    IMPLEMENTED_ROUTE_DEFINITIONS.filter((route) => route.path.startsWith('/api/v1/')).length
  );
});

test('Postman collection and environment use safe loopback variables with api/v1 exactly once', () => {
  const artifacts = loadArtifacts();
  assert.deepEqual(validatePostmanCollection(artifacts.postmanCollection), []);
  assert.deepEqual(validatePostmanEnvironment(artifacts.postmanEnvironment), []);
  assert.doesNotMatch(
    JSON.stringify(artifacts.postmanEnvironment),
    /password|privateKey|accessToken|refreshToken/i
  );
  assert.match(
    JSON.stringify(artifacts.postmanCollection),
    /replace-with-isolated-synthetic-password/
  );
});

test('validation rejects a documented but unimplemented product route', () => {
  const openApi = structuredClone(loadArtifacts().openApi) as {
    paths: Record<string, unknown>;
  };
  openApi.paths['/api/v1/auth/password/forgot'] = { post: { responses: { '200': { description: 'Fake' } } } };
  assert.ok(
    validateOpenApiDocument(openApi).includes(
      'OpenAPI documents unimplemented POST /api/v1/auth/password/forgot'
    )
  );
});

test('validation rejects duplicate or missing api/v1 prefixes', () => {
  const collection = structuredClone(loadArtifacts().postmanCollection) as {
    variable: Array<{ key: string; value: string }>;
  };
  collection.variable.find((variable) => variable.key === 'apiV1BaseUrl')!.value =
    '{{baseUrl}}/api/v1/api/v1';
  assert.ok(
    validatePostmanCollection(collection).includes(
      'Postman apiV1BaseUrl must apply /api/v1 exactly once'
    )
  );
});

test('validation rejects checked-in secret-shaped Postman variables', () => {
  const environment = structuredClone(loadArtifacts().postmanEnvironment) as {
    values: Array<Record<string, unknown>>;
  };
  environment.values.push({ key: 'accessToken', value: 'not-a-real-token', type: 'secret' });
  const issues = validatePostmanEnvironment(environment);
  assert.ok(issues.some((issue) => issue.includes('secret variable accessToken')));
  assert.ok(issues.some((issue) => issue.includes('checked-in secret values')));
});

test('validation rejects unresolved OpenAPI component references', () => {
  const openApi = structuredClone(loadArtifacts().openApi) as {
    paths: Record<string, { get?: { responses?: Record<string, unknown> } }>;
  };
  openApi.paths['/health']!.get!.responses!['200'] = {
    description: 'Process is alive',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Missing' } } }
  };
  assert.ok(
    validateOpenApiDocument(openApi).includes(
      'OpenAPI local reference does not resolve: #/components/schemas/Missing'
    )
  );
});
