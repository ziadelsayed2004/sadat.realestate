import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectOpenApiRoutes,
  collectPostmanRoutes,
  IMPLEMENTED_ROUTE_DEFINITIONS
} from '../apps/api/src/modules/docs/api-artifacts.ts';
import { AUTHORIZATION_ROUTE_POLICIES } from '../apps/api/src/modules/security/authorization-matrix.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blueprintPath = path.join(repositoryRoot, 'agent_pack/01_product/API_ENDPOINT_BLUEPRINT.json');
const openApiPath = path.join(repositoryRoot, 'apps/api/openapi/openapi.json');
const postmanPath = path.join(repositoryRoot, 'apps/api/postman/Sadat-Real-Estate.postman_collection.json');
const writeMode = process.argv.includes('--write');

const HTTP_METHODS = new Set(['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function key(method, routePath) {
  return `${String(method).toUpperCase()} ${routePath}`;
}

function normalizePath(routePath) {
  return routePath.replaceAll('{', ':').replaceAll('}', '');
}

function unique(values) {
  return [...new Set(values)];
}

function collectPostmanRequests(items, output = []) {
  for (const item of items ?? []) {
    if (item?.item) collectPostmanRequests(item.item, output);
    if (item?.request && typeof item.request.method === 'string') output.push(item);
  }
  return output;
}

function postmanRoute(item) {
  const raw = item.request?.url?.raw;
  if (typeof raw !== 'string') return undefined;
  const route = raw.startsWith('{{apiV1BaseUrl}}')
    ? `/api/v1${raw.slice('{{apiV1BaseUrl}}'.length)}`
    : raw.startsWith('{{baseUrl}}')
      ? raw.slice('{{baseUrl}}'.length)
      : undefined;
  if (!route) return undefined;
  return key(item.request.method, route.split(/[?#]/u, 1)[0].replaceAll('{{namespace}}', ':namespace'));
}

function requestHeaders(item) {
  return Array.isArray(item.request?.header) ? item.request.header : [];
}

function hasHeader(item, name) {
  return requestHeaders(item).some((header) => String(header?.key).toLowerCase() === name.toLowerCase());
}

function hasBearerAuth(item) {
  return hasHeader(item, 'Authorization') || item.request?.auth?.type === 'bearer';
}

function policyMap() {
  return new Map(AUTHORIZATION_ROUTE_POLICIES.map((policy) => [key(policy.method, policy.path), policy]));
}

function blueprintIssues(blueprint, runtimeRoutes) {
  const issues = [];
  const runtimeKeys = new Set(runtimeRoutes.map((route) => key(route.method, route.path)));
  const blueprintKeys = blueprint.map((route) => key(route.method, route.path));
  const implemented = blueprint.filter((route) => route.status === 'implemented');
  const implementedKeys = new Set(implemented.map((route) => key(route.method, route.path)));

  for (const duplicate of new Set(blueprintKeys.filter((value, index) => blueprintKeys.indexOf(value) !== index))) {
    issues.push(`Blueprint contains duplicate ${duplicate}`);
  }
  for (const route of implemented) {
    const routeKey = key(route.method, route.path);
    if (!runtimeKeys.has(routeKey)) issues.push(`Blueprint marks absent route implemented: ${routeKey}`);
  }
  for (const route of blueprint.filter((value) => value.status === 'planned')) {
    const routeKey = key(route.method, route.path);
    if (runtimeKeys.has(routeKey)) issues.push(`Blueprint marks live route planned: ${routeKey}`);
  }
  for (const route of runtimeRoutes) {
    const routeKey = key(route.method, route.path);
    if (!implementedKeys.has(routeKey)) issues.push(`Runtime route is absent from implemented blueprint: ${routeKey}`);
  }
  return issues;
}

function securityHas(operation, scheme) {
  return Array.isArray(operation.security)
    && operation.security.some((entry) => entry && typeof entry === 'object' && scheme in entry);
}

function artifactIssues(openApi, postman, policies) {
  const issues = [];
  const runtimeExpected = IMPLEMENTED_ROUTE_DEFINITIONS.map((route) => key(route.method, route.path)).sort();
  if (JSON.stringify(collectOpenApiRoutes(openApi)) !== JSON.stringify(runtimeExpected)) {
    issues.push('OpenAPI route set does not equal runtime route set');
  }
  if (JSON.stringify(collectPostmanRoutes(postman)) !== JSON.stringify(runtimeExpected)) {
    issues.push('Postman route set does not equal runtime route set');
  }

  for (const [routePath, pathItem] of Object.entries(openApi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      const upper = method.toUpperCase();
      if (!HTTP_METHODS.has(upper) || !operation || typeof operation !== 'object') continue;
      const policy = policies.get(key(upper, normalizePath(routePath)));
      if (!policy) {
        issues.push(`OpenAPI operation has no authorization policy: ${upper} ${routePath}`);
        continue;
      }
      if (policy.access === 'role' && !securityHas(operation, 'bearerAuth')) {
        issues.push(`OpenAPI protected operation is missing bearer security: ${upper} ${routePath}`);
      }
      if (policy.access === 'session' && !securityHas(operation, 'refreshCookie')) {
        issues.push(`OpenAPI session operation is missing refresh-cookie security: ${upper} ${routePath}`);
      }
      if (policy.access === 'signed_grant' && !securityHas(operation, 'signedGrant')) {
        issues.push(`OpenAPI signed-grant operation is missing signedGrant security: ${upper} ${routePath}`);
      }
      if (policy.access === 'otp_grant' && operation['x-authentication'] !== 'provider-otp-grant') {
        issues.push(`OpenAPI OTP-grant operation is missing x-authentication: ${upper} ${routePath}`);
      }
    }
  }

  const requests = collectPostmanRequests(postman.item);
  for (const item of requests) {
    const routeKey = postmanRoute(item);
    const policy = routeKey ? policies.get(routeKey) : undefined;
    if (!policy) continue;
    if (policy.access === 'role' && !hasBearerAuth(item)) {
      issues.push(`Postman protected request is missing bearer auth: ${routeKey}`);
    }
    if (policy.access === 'session' && !hasHeader(item, 'Cookie')) {
      issues.push(`Postman session request is missing refresh cookie: ${routeKey}`);
    }
    if (policy.access === 'signed_grant' && !String(item.request?.url?.raw).includes('signature=')) {
      issues.push(`Postman signed-grant request is missing signature query: ${routeKey}`);
    }
  }
  return issues;
}

function applyArtifactHardening(openApi, postman, policies) {
  openApi.components ??= {};
  openApi.components.securitySchemes ??= {};
  openApi.components.securitySchemes.signedGrant ??= {
    type: 'apiKey',
    in: 'query',
    name: 'signature',
    description: 'Short-lived exact-object signature. The URL must also carry its expiry query parameter.'
  };

  for (const [routePath, pathItem] of Object.entries(openApi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      const upper = method.toUpperCase();
      if (!HTTP_METHODS.has(upper) || !operation || typeof operation !== 'object') continue;
      const policy = policies.get(key(upper, normalizePath(routePath)));
      if (!policy) continue;
      if (policy.access === 'role') operation.security = [{ bearerAuth: [] }];
      if (policy.access === 'session') operation.security = [{ refreshCookie: [] }];
      if (policy.access === 'signed_grant') operation.security = [{ signedGrant: [] }];
      if (policy.access === 'otp_grant') operation['x-authentication'] = 'provider-otp-grant';
    }
  }

  const requests = collectPostmanRequests(postman.item);
  for (const item of requests) {
    const routeKey = postmanRoute(item);
    const policy = routeKey ? policies.get(routeKey) : undefined;
    if (!policy) continue;
    item.request.header ??= [];
    if (policy.access === 'role' && !hasBearerAuth(item)) {
      item.request.auth = {
        type: 'bearer',
        bearer: [{ key: 'token', value: '{{syntheticBearer}}', type: 'string' }]
      };
    }
    if (policy.access === 'session' && !hasHeader(item, 'Cookie')) {
      item.request.header.push({ key: 'Cookie', value: 'sadat_refresh={{syntheticRefreshCookie}}' });
    }
  }
  postman.variable ??= [];
  if (!postman.variable.some((variable) => variable?.key === 'syntheticRefreshCookie')) {
    postman.variable.push({ key: 'syntheticRefreshCookie', value: 'replace-with-runtime-refresh-cookie', type: 'string' });
  }
}

const blueprint = readJson(blueprintPath);
const openApi = readJson(openApiPath);
const postman = readJson(postmanPath);
const policies = policyMap();
const issues = [
  ...blueprintIssues(blueprint, IMPLEMENTED_ROUTE_DEFINITIONS),
  ...artifactIssues(openApi, postman, policies)
];

if (writeMode) {
  applyArtifactHardening(openApi, postman, policies);
  writeJson(openApiPath, openApi);
  writeJson(postmanPath, postman);
  process.stdout.write('API_ARTIFACT_SECURITY_UPDATED\n');
}

const finalIssues = writeMode
  ? [...blueprintIssues(blueprint, IMPLEMENTED_ROUTE_DEFINITIONS), ...artifactIssues(openApi, postman, policies)]
  : issues;
const summary = {
  blueprintTotal: blueprint.length,
  blueprintImplemented: blueprint.filter((route) => route.status === 'implemented').length,
  blueprintPlanned: blueprint.filter((route) => route.status === 'planned').length,
  runtimeRoutes: IMPLEMENTED_ROUTE_DEFINITIONS.length,
  policyRoutes: policies.size,
  errors: unique(finalIssues)
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (finalIssues.length > 0) process.exitCode = 1;
