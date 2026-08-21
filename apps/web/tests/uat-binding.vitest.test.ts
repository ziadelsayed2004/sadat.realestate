import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UAT_FIXTURE_STATES, UAT_FIXTURE_SURFACES } from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { createUatFixtureCatalog, assertUatFixtureCatalog } from '../../api/src/modules/fixtures/catalog.ts';
import { resolveRoute } from '../src/routes/route-table.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const coveragePath = path.join(repositoryRoot, 'agent_pack', '01_product', 'SCREEN_COVERAGE.json');
const manifestPath = path.join(repositoryRoot, 'agent_pack', '09_sources', 'DESIGN_SOURCE_MANIFEST.json');
const taskStatePath = path.join(repositoryRoot, 'agent_pack', '03_execution', 'TASK_STATE.json');
const inventoryScriptPath = path.join(repositoryRoot, 'apps', 'api', 'src', 'modules', 'database', 'api-inventory.ts');
const openApiPath = path.join(repositoryRoot, 'apps', 'api', 'openapi', 'openapi.json');
const postmanPath = path.join(repositoryRoot, 'apps', 'api', 'postman', 'Sadat-Real-Estate.postman_collection.json');
const journeyPostmanPath = path.join(repositoryRoot, 'apps', 'api', 'postman', 'Sadat-Real-Estate.journeys.postman_collection.json');

interface ScreenCoverageEntry {
  readonly id: string;
  readonly route: string;
  readonly frontendTaskId: string;
}

interface DesignSourceEntry {
  readonly id: string;
  readonly localSources: readonly { readonly localPath: string }[];
  readonly visualSourceStatus: string;
}

interface TaskState {
  readonly tasks: Record<string, { readonly status: string }>;
}

interface RuntimeRoute {
  readonly method: string;
  readonly path: string;
  readonly operationId: string;
  readonly status: 'implemented';
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function routeKey(method: string, routePath: string): string {
  return `${method.toUpperCase()} ${routePath}`;
}

function normalizeOpenApiPath(routePath: string): string {
  return routePath.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/gu, ':$1');
}

function collectOpenApiRoutes(document: { readonly paths?: Record<string, Record<string, unknown>> }): string[] {
  const methods = new Set(['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace']);
  return Object.entries(document.paths ?? {}).flatMap(([routePath, pathItem]) => Object.keys(pathItem)
    .filter(method => methods.has(method.toLowerCase()))
    .map(method => routeKey(method, normalizeOpenApiPath(routePath)))
  ).sort();
}

function collectPostmanRoutes(items: unknown, routes: string[] = []): string[] {
  if (!Array.isArray(items)) return routes;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    collectPostmanRoutes(record.item, routes);
    const request = record.request;
    if (!request || typeof request !== 'object') continue;
    const requestRecord = request as Record<string, unknown>;
    const method = requestRecord.method;
    const url = requestRecord.url;
    if (typeof method !== 'string' || !url || typeof url !== 'object') continue;
    const raw = (url as Record<string, unknown>).raw;
    if (typeof raw !== 'string') continue;
    const routePath = raw.startsWith('{{apiV1BaseUrl}}')
      ? `/api/v1${raw.slice('{{apiV1BaseUrl}}'.length)}`
      : raw.startsWith('{{baseUrl}}')
        ? raw.slice('{{baseUrl}}'.length)
        : '';
    if (routePath.startsWith('/')) {
      const normalizedPath = (routePath.split(/[?#]/u, 1)[0] ?? '').replace(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/gu, ':$1');
      routes.push(routeKey(method, normalizedPath));
    }
  }
  return routes.sort();
}

function runtimeInventory(): RuntimeRoute[] {
  const output = execFileSync(process.execPath, ['--import', 'tsx', inventoryScriptPath], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  });
  return JSON.parse(output) as RuntimeRoute[];
}

describe('UAT, Postman, and screen-state data binding', () => {
  it('binds every registered screen to a resolvable route, completed owner task, and approved source', () => {
    const coverage = readJson<ScreenCoverageEntry[]>(coveragePath);
    const manifest = readJson<{ readonly screens: readonly DesignSourceEntry[] }>(manifestPath);
    const taskState = readJson<TaskState>(taskStatePath);
    const sourceById = new Map(manifest.screens.map(source => [source.id, source]));

    expect(coverage).toHaveLength(131);
    for (const screen of coverage) {
      const source = sourceById.get(screen.id);
      expect(source, screen.id).toBeDefined();
      expect(taskState.tasks[screen.frontendTaskId]?.status, screen.frontendTaskId).toBe('complete');
      expect(resolveRoute(screen.route.replace(/:([A-Za-z][A-Za-z0-9_]*)/gu, 'uat-sample')).kind, screen.id).toBe('matched');
      const completionPath = path.join(repositoryRoot, 'agent_pack', '07_finish', screen.frontendTaskId, 'completion.json');
      expect(existsSync(completionPath), `${screen.frontendTaskId} completion evidence`).toBe(true);
      const completion = readJson<{ readonly taskId: string; readonly filesChanged: readonly string[]; readonly verification: readonly unknown[] }>(completionPath);
      expect(completion.taskId, screen.frontendTaskId).toBe(screen.frontendTaskId);
      expect(completion.filesChanged.length, screen.frontendTaskId).toBeGreaterThan(0);
      expect(completion.verification.length, screen.frontendTaskId).toBeGreaterThan(0);
      if (source === undefined) continue;
      if (screen.id === 'ADM-54') {
        expect(source.visualSourceStatus).toBe('EXTERNAL_GROUP_REFERENCE_ONLY');
      } else {
        expect(source.localSources.length, screen.id).toBeGreaterThan(0);
        for (const localSource of source.localSources) {
          expect(existsSync(path.join(repositoryRoot, localSource.localPath)), localSource.localPath).toBe(true);
        }
      }
    }
  });

  it('keeps the runtime inventory, OpenAPI, and checked-in Postman collection on the same implemented route set', () => {
    const inventory = runtimeInventory();
    const inventoryRoutes = inventory.map(route => routeKey(route.method, route.path)).sort();
    const openApiRoutes = collectOpenApiRoutes(readJson(openApiPath)).sort();
    const postmanCollection = readJson<{ readonly item?: unknown }>(postmanPath);
    const journeyCollection = readJson<{ readonly item?: unknown }>(journeyPostmanPath);
    const postmanRoutes = collectPostmanRoutes(postmanCollection.item).sort();
    const journeyRoutes = collectPostmanRoutes(journeyCollection.item);

    expect(inventory.length).toBeGreaterThan(0);
    expect(inventory.every(route => route.status === 'implemented')).toBe(true);
    expect(new Set(openApiRoutes)).toEqual(new Set(inventoryRoutes));
    expect(new Set(postmanRoutes)).toEqual(new Set(inventoryRoutes));
    for (const route of journeyRoutes) expect(inventoryRoutes).toContain(route);
  }, 30_000);

  it('provides deterministic, credential-free fixtures for every surface and required state', () => {
    const catalog = createUatFixtureCatalog();
    expect(assertUatFixtureCatalog(catalog)).toEqual(catalog);
    expect(catalog.items).toHaveLength(UAT_FIXTURE_SURFACES.length * UAT_FIXTURE_STATES.length);
    for (const surface of UAT_FIXTURE_SURFACES) {
      for (const state of UAT_FIXTURE_STATES) {
        const fixture = catalog.items.find(item => item.key === `${surface}.${state}`);
        expect(fixture, `${surface}.${state}`).toBeDefined();
        expect(fixture?.synthetic, `${surface}.${state}`).toBe(true);
        expect(fixture?.locale, `${surface}.${state}`).toBe('en');
      }
    }
    expect(JSON.stringify(catalog)).not.toMatch(/(?:password|token|secret|credential|authorization|privateKey|signedUrl)/iu);
  });
});
