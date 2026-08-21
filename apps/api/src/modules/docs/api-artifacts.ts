import { OPERATIONAL_ROUTE_DEFINITIONS } from '../database/health.js';
import { AUTH_ROUTE_DEFINITIONS } from '../auth/router.js';
import { SEEKER_ROUTE_DEFINITIONS } from '../seeker/router.js';
import { PROVIDER_ROUTE_DEFINITIONS } from '../provider/router.js';
import { PAYMENT_ROUTE_DEFINITIONS } from '../payments/router.js';
import { UPLOAD_ROUTE_DEFINITIONS } from '../uploads/router.js';
import { RBAC_ROUTE_DEFINITIONS } from '../rbac/router.js';
import { ACCOUNT_ROUTE_DEFINITIONS } from '../accounts/router.js';
import { AUDIT_ROUTE_DEFINITIONS } from '../audit/router.js';
import { LOCATION_ROUTE_DEFINITIONS } from '../locations/router.js';
import { TAXONOMY_ROUTE_DEFINITIONS } from '../taxonomy/router.js';
import { FEATURE_ROUTE_DEFINITIONS } from '../taxonomy/features.js';
import { PROJECT_ROUTE_DEFINITIONS } from '../projects/router.js';
import { PROPERTY_ROUTE_DEFINITIONS } from '../properties/router.js';
import { PROPERTY_MEDIA_ROUTE_DEFINITIONS } from '../media/router.js';
import { MODERATION_ROUTE_DEFINITIONS } from '../moderation/router.js';
import { PUBLIC_ROUTE_DEFINITIONS } from '../public/router.js';
import { SEARCH_ROUTE_DEFINITIONS } from '../search/router.js';
import { COMPARE_ROUTE_DEFINITIONS } from '../compare/router.js';
import { ORGANIZATION_ROUTE_DEFINITIONS } from '../organizations/router.js';
import { FAVORITE_ROUTE_DEFINITIONS } from '../favorites/router.js';
import { NOTIFICATION_ROUTE_DEFINITIONS } from '../notifications/router.js';
import { SETTINGS_ROUTE_DEFINITIONS } from '../settings/router.js';
import { REQUEST_ROUTE_DEFINITIONS } from '../requests/router.js';
import { VIEWING_ROUTE_DEFINITIONS } from '../viewings/router.js';
import { ARTICLE_ROUTE_DEFINITIONS } from '../articles/router.js';
import { COMMUNITY_ROUTE_DEFINITIONS } from '../community/router.js';
import { CMS_PUBLIC_ROUTE_DEFINITIONS } from '../cms/public-router.js';
import { CMS_ADMIN_ROUTE_DEFINITIONS } from '../cms/admin-content-router.js';
import { ADMIN_OVERVIEW_ROUTE_DEFINITIONS } from '../admin/overview-router.js';
import { ADMINISTRATOR_ROUTE_DEFINITIONS } from '../admin/administrator-router.js';
import { ADMIN_ADS_ROUTE_DEFINITIONS } from '../ads/admin-router.js';
import { ADMIN_BANNER_ROUTE_DEFINITIONS } from '../ads/banner-router.js';
import { ADMIN_ADVERTISING_REPORT_ROUTE_DEFINITIONS } from '../reports/advertising-ledger-router.js';
import { ADMIN_COMMISSION_POLICY_ROUTE_DEFINITIONS } from '../commissions/policy-router.js';
import { ADMIN_COMMISSION_ACCOUNT_ROUTE_DEFINITIONS } from '../commissions/account-router.js';
import { ADMIN_COMMISSION_EXCEPTION_ROUTE_DEFINITIONS } from '../commissions/exception-router.js';
import { ADMIN_COMMISSION_CONFIRMATION_ROUTE_DEFINITIONS } from '../commissions/confirmation-router.js';
import { ADMIN_COMMISSION_CHANGE_LOG_ROUTE_DEFINITIONS } from '../commissions/change-log-router.js';

export const IMPLEMENTED_ROUTE_DEFINITIONS = Object.freeze([
  ...OPERATIONAL_ROUTE_DEFINITIONS,
  ...AUTH_ROUTE_DEFINITIONS,
  ...SEEKER_ROUTE_DEFINITIONS,
  ...PROVIDER_ROUTE_DEFINITIONS,
  ...PAYMENT_ROUTE_DEFINITIONS,
  ...UPLOAD_ROUTE_DEFINITIONS,
  ...RBAC_ROUTE_DEFINITIONS,
  ...ACCOUNT_ROUTE_DEFINITIONS,
  ...AUDIT_ROUTE_DEFINITIONS,
  ...LOCATION_ROUTE_DEFINITIONS,
  ...TAXONOMY_ROUTE_DEFINITIONS,
  ...FEATURE_ROUTE_DEFINITIONS,
  ...PROJECT_ROUTE_DEFINITIONS,
  ...PROPERTY_ROUTE_DEFINITIONS,
  ...PROPERTY_MEDIA_ROUTE_DEFINITIONS,
  ...MODERATION_ROUTE_DEFINITIONS,
  ...PUBLIC_ROUTE_DEFINITIONS,
  ...SEARCH_ROUTE_DEFINITIONS,
  ...COMPARE_ROUTE_DEFINITIONS,
  ...ORGANIZATION_ROUTE_DEFINITIONS,
  ...FAVORITE_ROUTE_DEFINITIONS,
  ...NOTIFICATION_ROUTE_DEFINITIONS,
  ...SETTINGS_ROUTE_DEFINITIONS,
  ...REQUEST_ROUTE_DEFINITIONS,
  ...VIEWING_ROUTE_DEFINITIONS,
  ...ARTICLE_ROUTE_DEFINITIONS,
  ...COMMUNITY_ROUTE_DEFINITIONS,
  ...CMS_PUBLIC_ROUTE_DEFINITIONS,
  ...CMS_ADMIN_ROUTE_DEFINITIONS,
  ...ADMIN_OVERVIEW_ROUTE_DEFINITIONS,
  ...ADMINISTRATOR_ROUTE_DEFINITIONS,
  ...ADMIN_ADS_ROUTE_DEFINITIONS,
  ...ADMIN_BANNER_ROUTE_DEFINITIONS,
  ...ADMIN_ADVERTISING_REPORT_ROUTE_DEFINITIONS,
  ...ADMIN_COMMISSION_POLICY_ROUTE_DEFINITIONS,
  ...ADMIN_COMMISSION_ACCOUNT_ROUTE_DEFINITIONS,
  ...ADMIN_COMMISSION_EXCEPTION_ROUTE_DEFINITIONS,
  ...ADMIN_COMMISSION_CONFIRMATION_ROUTE_DEFINITIONS,
  ...ADMIN_COMMISSION_CHANGE_LOG_ROUTE_DEFINITIONS
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

export const JOURNEY_POSTMAN_GROUPS = ['Public', 'Seeker', 'Provider', 'Admin', 'Setup & Cleanup'] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function routeKey(method: string, routePath: string): string {
  return `${method.toUpperCase()} ${routePath}`;
}

function normalizePathParameters(routePath: string): string {
  return routePath.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, ':$1');
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
      .map((method) => routeKey(method, normalizePathParameters(routePath)));
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
    const routePathWithQuery = raw.startsWith('{{apiV1BaseUrl}}')
      ? `${PRODUCT_API_BASE_PATH}${raw.slice('{{apiV1BaseUrl}}'.length)}`
      : raw.startsWith('{{baseUrl}}')
        ? raw.slice('{{baseUrl}}'.length)
        : '';
    const routePath = routePathWithQuery.split(/[?#]/, 1)[0] ?? '';
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

function collectJourneyItems(items: unknown, output: JsonRecord[] = []): JsonRecord[] {
  if (!Array.isArray(items)) return output;
  for (const item of items) {
    if (!isRecord(item)) continue;
    if (Array.isArray(item.item)) collectJourneyItems(item.item, output);
    if (isRecord(item.request)) output.push(item);
  }
  return output;
}

export function validateJourneyPostmanCollection(
  collection: unknown,
  implementedRoutes: readonly ImplementedRouteDefinition[] = IMPLEMENTED_ROUTE_DEFINITIONS
): string[] {
  if (!isRecord(collection)) return ['Journey Postman collection must be an object'];
  const issues: string[] = [];
  const info = isRecord(collection.info) ? collection.info : undefined;
  if (info?.schema !== POSTMAN_COLLECTION_SCHEMA) issues.push('Journey Postman collection schema is invalid');
  const variables = valuesByKey(collection.variable);
  issues.push(...validateNoSecretVariables(variables, 'Journey Postman collection'));
  if (variables.get('baseUrl')?.value !== 'http://127.0.0.1:3000') issues.push('Journey Postman baseUrl must use the safe loopback default');
  if (variables.get('apiV1BaseUrl')?.value !== `{{baseUrl}}${PRODUCT_API_BASE_PATH}`) issues.push(`Journey Postman apiV1BaseUrl must apply ${PRODUCT_API_BASE_PATH} exactly once`);
  const groups = new Set((Array.isArray(collection.item) ? collection.item : [])
    .filter(isRecord)
    .filter(item => Array.isArray(item.item))
    .map(item => item.name)
    .filter((name): name is string => typeof name === 'string'));
  for (const group of JOURNEY_POSTMAN_GROUPS) if (!groups.has(group)) issues.push(`Journey Postman collection is missing group ${group}`);
  const expected = new Set(expectedRouteKeys(implementedRoutes));
  const requests = collectJourneyItems(collection.item);
  if (requests.length === 0) issues.push('Journey Postman collection must contain requests');
  for (const item of requests) {
    const request = isRecord(item.request) ? item.request : undefined;
    const method = request && typeof request.method === 'string' ? request.method : undefined;
    const url = request && isRecord(request.url) && typeof request.url.raw === 'string' ? request.url.raw : undefined;
    if (!method || !url) {
      issues.push(`Journey Postman request ${String(item.name)} is missing method or URL`);
      continue;
    }
    const raw = url.startsWith('{{apiV1BaseUrl}}')
      ? `${PRODUCT_API_BASE_PATH}${url.slice('{{apiV1BaseUrl}}'.length)}`
      : url.startsWith('{{baseUrl}}')
        ? url.slice('{{baseUrl}}'.length)
        : url;
    const path = raw.split(/[?#]/, 1)[0] ?? '';
    const normalizedPath = path.replace(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g, ':$1');
    const key = routeKey(method, normalizedPath);
    if (!expected.has(key)) issues.push(`Journey Postman documents unimplemented ${key}`);
    if (!Array.isArray(item.event) || !item.event.some(event => isRecord(event) && event.listen === 'test')) {
      issues.push(`Journey Postman request ${String(item.name)} is missing a test script`);
    }
  }
  return [...new Set(issues)];
}

export function validateApiArtifacts(input: ApiArtifactValidationInput): string[] {
  return [
    ...validateOpenApiDocument(input.openApi, input.implementedRoutes),
    ...validatePostmanCollection(input.postmanCollection, input.implementedRoutes),
    ...validatePostmanEnvironment(input.postmanEnvironment)
  ];
}
