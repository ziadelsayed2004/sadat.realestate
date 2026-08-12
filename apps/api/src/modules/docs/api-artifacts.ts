import { OPERATIONAL_ROUTE_DEFINITIONS } from '../database/health.js';
import { AUTH_ROUTE_DEFINITIONS } from '../auth/router.js';
import { SEEKER_ROUTE_DEFINITIONS } from '../seeker/router.js';

export const IMPLEMENTED_ROUTE_DEFINITIONS = Object.freeze([
  ...OPERATIONAL_ROUTE_DEFINITIONS,
  ...AUTH_ROUTE_DEFINITIONS,
  ...SEEKER_ROUTE_DEFINITIONS
]);

export const PRODUCT_API_BASE_PATH = '/api/v1';
export const POSTMAN_COLLECTION_SCHEMA =
  'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';
export const POSTMAN_ENVIRONMENT_SCHEMA =
  'https://schema.getpostman.com/json/collection/v2.1.0/environment.json';

const HTTP_METHODS = new Set([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace'
]);
const SECRET_KEY = /(authorization|credential|password|private|secret|token)/i;

type JsonRecord = Record<string, unknown>;
type ImplementedRouteDefinition = (typeof IMPLEMENTED_ROUTE_DEFINITIONS)[number];

export interface PostmanEnvironmentValue {
  key?: unknown;
  value?: unknown;
  enabled?: unknown;
  type?: unknown;
}

export interface ApiArtifactValidationInput {
  openApi: unknown;
  postmanCollection: unknown;
  postmanEnvironment: unknown;
  implementedRoutes?: readonly ImplementedRouteDefinition[];
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function routeKey(method: string, routePath: string): string {
  return `${method.toUpperCase()} ${routePath}`;
}

function expectedRouteKeys(
  routes: readonly ImplementedRouteDefinition[] = IMPLEMENTED_ROUTE_DEFINITIONS
): string[] {
  return routes.map((route) => routeKey(route.method, route.path)).sort();
}

function compareRoutes(actual: readonly string[], expected: readonly string[], label: string): string[] {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return [
    ...expected.filter((route) => !actualSet.has(route)).map((route) => `${label} is missing ${route}`),
    ...actual.filter((route) => !expectedSet.has(route)).map((route) => `${label} documents unimplemented ${route}`)
  ];
}

export function collectOpenApiRoutes(document: unknown): string[] {
  if (!isRecord(document) || !isRecord(document.paths)) return [];
  return Object.entries(document.paths).flatMap(([routePath, pathItem]) => {
    if (!isRecord(pathItem)) return [];
    return Object.keys(pathItem)
      .filter((key) => HTTP_METHODS.has(key.toLowerCase()))
      .map((method) => routeKey(method, routePath));
  }).sort();
}

function localReferenceExists(document: JsonRecord, reference: string): boolean {
  if (!reference.startsWith('#/')) return false;
  let current: unknown = document;
  for (const encodedSegment of reference.slice(2).split('/')) {
    const segment = encodedSegment.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!isRecord(current) || !(segment in current)) return false;
    current = current[segment];
  }
  return true;
}

function collectLocalReferences(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectLocalReferences(item, output);
    return output;
  }
  if (!isRecord(value)) return output;
  if (typeof value.$ref === 'string') output.push(value.$ref);
  for (const child of Object.values(value)) collectLocalReferences(child, output);
  return output;
}

export function validateOpenApiDocument(
  document: unknown,
  implementedRoutes: readonly ImplementedRouteDefinition[] = IMPLEMENTED_ROUTE_DEFINITIONS
): string[] {
  if (!isRecord(document)) return ['OpenAPI document must be an object'];
  const issues: string[] = [];
  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.1.')) {
    issues.push('OpenAPI document must use version 3.1');
  }
  if (document.jsonSchemaDialect !== 'https://json-schema.org/draft/2020-12/schema') {
    issues.push('OpenAPI document must declare the JSON Schema 2020-12 dialect');
  }
  if (document['x-product-api-base-path'] !== PRODUCT_API_BASE_PATH) {
    issues.push(`OpenAPI product base path must be ${PRODUCT_API_BASE_PATH}`);
  }

  const actualRoutes = collectOpenApiRoutes(document);
  issues.push(...compareRoutes(actualRoutes, expectedRouteKeys(implementedRoutes), 'OpenAPI'));
  for (const route of actualRoutes) {
    const routePath = route.slice(route.indexOf(' ') + 1);
    if (routePath.startsWith('/api/') && !routePath.startsWith(`${PRODUCT_API_BASE_PATH}/`)) {
      issues.push(`Product route is outside ${PRODUCT_API_BASE_PATH}: ${routePath}`);
    }
    if (routePath.includes(`${PRODUCT_API_BASE_PATH}${PRODUCT_API_BASE_PATH}`)) {
      issues.push(`Product API base path is applied more than once: ${routePath}`);
    }
  }

  const components = isRecord(document.components) ? document.components : undefined;
  const schemas = components && isRecord(components.schemas) ? components.schemas : undefined;
  for (const requiredSchema of ['SuccessEnvelope', 'ErrorEnvelope', 'HealthResponse', 'ReadinessResponse']) {
    if (!schemas || !(requiredSchema in schemas)) issues.push(`OpenAPI component is missing: ${requiredSchema}`);
  }
  for (const reference of collectLocalReferences(document)) {
    if (!localReferenceExists(document, reference)) issues.push(`OpenAPI local reference does not resolve: ${reference}`);
  }
  return [...new Set(issues)];
}

function collectPostmanItems(items: unknown, routes: string[]): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!isRecord(item)) continue;
    if (Array.isArray(item.item)) collectPostmanItems(item.item, routes);
    if (!isRecord(item.request)) continue;
    const method = item.request.method;
    const url = item.request.url;
    if (typeof method !== 'string' || !isRecord(url) || typeof url.raw !== 'string') continue;
    const raw = url.raw;
    const routePath = raw.startsWith('{{apiV1BaseUrl}}')
      ? `${PRODUCT_API_BASE_PATH}${raw.slice('{{apiV1BaseUrl}}'.length)}`
      : raw.startsWith('{{baseUrl}}')
        ? raw.slice('{{baseUrl}}'.length)
        : '';
    if (routePath.startsWith('/')) routes.push(routeKey(method, routePath));
  }
}

export function collectPostmanRoutes(collection: unknown): string[] {
  if (!isRecord(collection)) return [];
  const routes: string[] = [];
  collectPostmanItems(collection.item, routes);
  return routes.sort();
}

function valuesByKey(values: unknown): Map<string, PostmanEnvironmentValue> {
  const result = new Map<string, PostmanEnvironmentValue>();
  if (!Array.isArray(values)) return result;
  for (const item of values) {
    if (!isRecord(item) || typeof item.key !== 'string') continue;
    result.set(item.key, item);
  }
  return result;
}

function validateNoSecretVariables(values: Map<string, PostmanEnvironmentValue>, label: string): string[] {
  const issues: string[] = [];
  for (const [key, item] of values) {
    if (SECRET_KEY.test(key)) issues.push(`${label} must not define secret variable ${key}`);
    if (item.type === 'secret') issues.push(`${label} must not contain checked-in secret values`);
  }
  return issues;
}

export function validatePostmanCollection(
  collection: unknown,
  implementedRoutes: readonly ImplementedRouteDefinition[] = IMPLEMENTED_ROUTE_DEFINITIONS
): string[] {
  if (!isRecord(collection)) return ['Postman collection must be an object'];
  const issues: string[] = [];
  const info = isRecord(collection.info) ? collection.info : undefined;
  if (info?.schema !== POSTMAN_COLLECTION_SCHEMA) issues.push('Postman collection schema is invalid');

  const variables = valuesByKey(collection.variable);
  const baseUrl = variables.get('baseUrl')?.value;
  const apiV1BaseUrl = variables.get('apiV1BaseUrl')?.value;
  if (baseUrl !== 'http://127.0.0.1:3000') issues.push('Postman baseUrl must use the safe loopback default');
  if (apiV1BaseUrl !== `{{baseUrl}}${PRODUCT_API_BASE_PATH}`) {
    issues.push(`Postman apiV1BaseUrl must apply ${PRODUCT_API_BASE_PATH} exactly once`);
  }
  issues.push(...validateNoSecretVariables(variables, 'Postman collection'));

  const actualRoutes = collectPostmanRoutes(collection);
  issues.push(...compareRoutes(actualRoutes, expectedRouteKeys(implementedRoutes), 'Postman'));
  return issues;
}

export function validatePostmanEnvironment(environment: unknown): string[] {
  if (!isRecord(environment)) return ['Postman environment must be an object'];
  const issues: string[] = [];
  if (environment.schema !== POSTMAN_ENVIRONMENT_SCHEMA) issues.push('Postman environment schema is invalid');
  const values = valuesByKey(environment.values);
  if (values.get('baseUrl')?.value !== 'http://127.0.0.1:3000') {
    issues.push('Postman environment baseUrl must use the safe loopback default');
  }
  if (values.get('apiV1BaseUrl')?.value !== `{{baseUrl}}${PRODUCT_API_BASE_PATH}`) {
    issues.push(`Postman environment apiV1BaseUrl must apply ${PRODUCT_API_BASE_PATH} exactly once`);
  }
  issues.push(...validateNoSecretVariables(values, 'Postman environment'));
  return issues;
}

export function validateApiArtifacts(input: ApiArtifactValidationInput): string[] {
  return [
    ...validateOpenApiDocument(input.openApi, input.implementedRoutes),
    ...validatePostmanCollection(input.postmanCollection, input.implementedRoutes),
    ...validatePostmanEnvironment(input.postmanEnvironment)
  ];
}
