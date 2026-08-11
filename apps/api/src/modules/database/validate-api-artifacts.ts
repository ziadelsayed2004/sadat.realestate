import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATIONAL_ROUTE_DEFINITIONS } from './health.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const openApiPath = path.join(apiRoot, 'openapi', 'openapi.json');
const postmanPath = path.join(apiRoot, 'postman', 'Sadat-Real-Estate.postman_collection.json');
const expected = OPERATIONAL_ROUTE_DEFINITIONS.map((route) => `${route.method} ${route.path}`);
const mode = process.argv[2];

function assertRoutes(actual: string[], label: string): void {
  if (JSON.stringify(actual.sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} routes do not match runtime inventory`);
  }
}

if (mode === 'openapi') {
  const document = JSON.parse(fs.readFileSync(openApiPath, 'utf8')) as { paths?: Record<string, { get?: unknown }> };
  const routes = Object.entries(document.paths ?? {}).flatMap(([route, definition]) => definition.get ? [`GET ${route}`] : []);
  assertRoutes(routes, 'OpenAPI');
  console.log('OPENAPI_VALID');
} else if (mode === 'postman') {
  const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8')) as { item?: Array<{ request?: { method?: string; url?: { raw?: string } } }> };
  const routes = (collection.item ?? []).flatMap((item) => {
    const method = item.request?.method;
    const raw = item.request?.url?.raw;
    const route = raw?.match(/\/(health|ready)$/)?.[0];
    return method && route ? [`${method} ${route}`] : [];
  });
  assertRoutes(routes, 'Postman');
  console.log('POSTMAN_VALID');
} else {
  console.error('Usage: validate-api-artifacts.ts <openapi|postman>');
  process.exit(1);
}
