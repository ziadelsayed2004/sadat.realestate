import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contractFreezeSchema,
  handoffScreenSchema,
  type ContractFreeze,
  type HandoffOperation,
  type HandoffScreen,
  type HandoffUnresolved
} from '@sadat-real-estate/contracts';
import { RUNTIME_ROUTE_INVENTORY } from '../docs/route-inventory.js';

export interface HandoffScreenSource {
  readonly id: string;
  readonly surface: 'public' | 'auth' | 'seeker' | 'provider' | 'admin';
  readonly englishName: string;
}

export interface ContractFreezeInput {
  readonly screens: readonly HandoffScreenSource[];
  readonly openapiDocument: unknown;
  readonly generatedAt?: string;
  readonly unresolved?: readonly HandoffUnresolved[];
}

/** Only stable, currently executable operation IDs may be referenced by a screen. */
export const SCREEN_OPERATION_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'PUB-01': ['getPublicHomepage'], 'PUB-02': ['listPublicProperties'], 'PUB-03': ['getPublicPropertyDetails'],
  'PUB-04': ['comparePublicProperties'], 'PUB-05': ['listPublicDevelopers'], 'PUB-06': ['getPublicDeveloper'],
  'AUTH-01': ['loginAdmin'], 'AUTH-02': ['registerSeeker'], 'AUTH-03': ['registerSeeker'],
  'AUTH-04': ['sendPhoneOtp', 'verifyPhoneOtp'], 'AUTH-05': ['sendPhoneOtp', 'verifyPhoneOtp'], 'AUTH-06': ['registerSeeker'],
  'AUTH-07': ['createProviderApplication'], 'AUTH-08': ['createProviderApplication'], 'AUTH-09': ['updateProviderAccountStep'],
  'AUTH-09+': ['updateProviderAccountStep'], 'AUTH-10': ['updateProviderBusinessStep'], 'AUTH-10+': ['updateProviderBusinessStep'],
  'AUTH-11': ['updateProviderCompanyStep'], 'AUTH-12': ['uploadProviderDocument'], 'AUTH-13': ['submitProviderApplication'],
  'AUTH-14': ['getProviderApplicationStatus'], 'AUTH-15': ['getProviderApplicationStatus'], 'AUTH-16': ['getProviderApplicationStatus'],
  'AUTH-17': ['getProviderApplicationStatus'],
  'SEK-01': ['getSeekerOverview'], 'SEK-02': ['listSeekerRequests'], 'SEK-03': ['getSeekerRequest'], 'SEK-04': ['getSeekerRequest'],
  'SEK-05': ['listSeekerViewings'], 'SEK-06': ['listSavedProperties'], 'SEK-07': ['listSeekerNotifications'],
  'SEK-08': ['getCurrentSeekerPreferences', 'updateCurrentSeekerPreferences'], 'SEK-09': ['getCurrentSeekerProfile', 'updateCurrentSeekerProfile'],
  'PRV-02': ['listProviderProperties'], 'PRV-03': ['createProviderProperty'], 'PRV-04': ['saveProviderPropertyStep'],
  'PRV-05': ['saveProviderPropertyStep'], 'PRV-06': ['saveProviderPropertyStep'], 'PRV-07': ['saveProviderPropertyStep'],
  'PRV-08': ['uploadProviderPropertyMedia', 'reorderProviderPropertyMedia', 'deleteProviderPropertyMedia'],
  'PRV-09': ['saveProviderPropertyStep'], 'PRV-10': ['submitProviderProperty'], 'PRV-11': ['submitProviderProperty'],
  'PRV-12': ['submitProviderProperty'], 'PRV-13': ['getProviderProperty'], 'PRV-14': ['getProviderProperty'],
  'PRV-15': ['listProviderProjects'], 'PRV-16': ['listProviderCustomerRequests'], 'PRV-17': ['createProviderCustomerRequest'],
  'PRV-18': ['listProviderViewings'], 'PRV-21': ['getProviderApplicationStatus'],
  'ADM-02': ['transitionAdminUserAccount'], 'ADM-04': ['reviewAdminProviderAccount'], 'ADM-05': ['downloadPrivateProviderDocument'],
  'ADM-09': ['listPropertyTaxonomy', 'createPropertyTaxonomy', 'updatePropertyTaxonomy', 'deletePropertyTaxonomy'],
  'ADM-10': ['listAdminLocations', 'createAdminLocation', 'updateAdminLocation', 'deleteAdminLocation'],
  'ADM-11': ['listAdminFeatures', 'createAdminFeature', 'updateAdminFeature', 'deleteAdminFeature'],
  'ADM-12': ['reviewAdminProject'], 'ADM-13': ['reviewAdminProject'], 'ADM-14': ['listAdminProperties'],
  'ADM-15': ['reviewAdminProperty'], 'ADM-16': ['listPossiblePropertyDuplicates'], 'ADM-17': ['listAdminPropertyReports', 'resolveAdminPropertyReport'],
  'ADM-18': ['listAdminRequests', 'getAdminRequest'], 'ADM-20': ['listOverdueAdminRequests'], 'ADM-22': ['listAdminViewings'],
  'ADM-23': ['listAdminRequests'], 'ADM-48': ['getAdminSettings', 'updateAdminSettings'], 'ADM-49': ['getAdminSettings', 'updateAdminSettings'],
  'ADM-50': ['getAdminSettings', 'updateAdminSettings'], 'ADM-51': ['getAdminSettings', 'updateAdminSettings'],
  'ADM-52': ['getAdminSettings', 'updateAdminSettings'], 'ADM-53': ['getAdminSettings', 'updateAdminSettings'],
  'ADM-54': ['getAdminSettings', 'updateAdminSettings'], 'ADM-55': ['getAdminSettings', 'updateAdminSettings'],
  'ADM-56': ['getAdminSettings', 'updateAdminSettings'], 'ADM-57': ['getAdminSettings', 'updateAdminSettings'],
  'ADM-58': ['getAdminSettings', 'updateAdminSettings'], 'ADM-59': ['listAdminRoles'], 'ADM-60': ['createAdminRole'],
  'ADM-61': ['updateAdminRole'], 'ADM-62': ['updateAdminRole'], 'ADM-63': ['listAdminRoles', 'createAdminRole', 'updateAdminRole'],
  'ADM-64': ['updateAdminRole'], 'ADM-65': ['listAdminNotifications', 'markAdminNotificationRead', 'markAllAdminNotificationsRead'],
  'ADM-66': ['listAuditLogs', 'getAuditLog']
});

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value), 'utf8').digest('hex');
}

export function toHandoffOperations(): HandoffOperation[] {
  return RUNTIME_ROUTE_INVENTORY.map(route => ({
    operationId: route.operationId,
    method: route.method as HandoffOperation['method'],
    path: route.path,
    status: 'implemented' as const
  }));
}

export function generateV1ClientTypes(operations: readonly HandoffOperation[]): string {
  const ids = [...operations].map(item => item.operationId).sort((left, right) => left.localeCompare(right));
  const union = ids.map(id => `  | '${id}'`).join('\n');
  const operationMap = ids.map(id => `  ${id}: { method: '${operations.find(item => item.operationId === id)?.method ?? 'GET'}' }`).join('\n');
  return [
    '// Generated from the frozen OpenAPI/runtime operation inventory; do not add planned routes here.',
    `export type V1OperationId =\n${union};`,
    'export type V1OperationMap = {',
    operationMap,
    '};',
    'export interface V1Client { request<T extends V1OperationId>(operationId: T, input: unknown): Promise<unknown>; }'
  ].join('\n');
}

export function buildScreenEndpointMatrix(
  screens: readonly HandoffScreenSource[],
  operations: readonly HandoffOperation[] = toHandoffOperations()
): HandoffScreen[] {
  const operationIds = new Set(operations.map(item => item.operationId));
  const seen = new Set<string>();
  return screens.map(screen => {
    if (seen.has(screen.id)) throw new Error(`Duplicate handoff screen ${screen.id}`);
    seen.add(screen.id);
    const endpointOperationIds = [...new Set(SCREEN_OPERATION_MAP[screen.id] ?? [])];
    const unknown = endpointOperationIds.filter(operationId => !operationIds.has(operationId));
    if (unknown.length) throw new Error(`Screen ${screen.id} references unknown operation(s): ${unknown.join(', ')}`);
    return handoffScreenSchema.parse({
      id: screen.id,
      surface: screen.surface,
      englishName: screen.englishName,
      endpointOperationIds,
      coverage: endpointOperationIds.length ? 'partial' : 'unmapped',
      notes: endpointOperationIds.length
        ? ['Backend operation references are frozen from the executable inventory; UI implementation is not claimed by this backend handoff.']
        : ['No implemented runtime endpoint is currently mapped; preserve a safe unavailable or empty state until a backend contract exists.']
    });
  });
}

export function buildContractFreeze(input: ContractFreezeInput): ContractFreeze {
  const operations = toHandoffOperations();
  const screens = buildScreenEndpointMatrix(input.screens, operations);
  const missingScreenCount = screens.filter(screen => screen.coverage === 'unmapped').length;
  const unresolved = input.unresolved ? [...input.unresolved] : [
    { kind: 'missing_runtime_endpoint' as const, message: `${missingScreenCount} registered screens have no implemented HTTP operation mapping.` },
    { kind: 'service_boundary' as const, message: 'Advertising and commission capabilities remain service-level contracts without invented HTTP routes.' },
    { kind: 'external_prerequisite' as const, message: 'No frontend runtime or external client generation service is started by this backend handoff task.' }
  ];
  return contractFreezeSchema.parse({
    version: 'v1',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceHashes: {
      openapiSha256: sha256(input.openapiDocument),
      runtimeInventorySha256: sha256(operations)
    },
    operations,
    screens,
    generatedClient: {
      language: 'typescript',
      source: 'openapi',
      basePath: '/api/v1',
      operationIds: operations.map(item => item.operationId),
      typeSource: generateV1ClientTypes(operations)
    },
    unresolved
  });
}

function repositoryRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../');
}

export function loadScreenRegistry(): HandoffScreenSource[] {
  const parsed = JSON.parse(readFileSync(path.join(repositoryRoot(), 'agent_pack/01_product/SCREEN_REGISTRY.json'), 'utf8')) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Screen registry must be an array');
  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Screen registry item ${index} is invalid`);
    const value = item as Record<string, unknown>;
    if (typeof value.id !== 'string' || typeof value.surface !== 'string' || typeof value.englishName !== 'string') {
      throw new Error(`Screen registry item ${index} is missing required handoff fields`);
    }
    return { id: value.id, surface: value.surface as HandoffScreenSource['surface'], englishName: value.englishName };
  });
}

export function loadOpenApiDocument(): unknown {
  return JSON.parse(readFileSync(path.join(repositoryRoot(), 'apps/api/openapi/openapi.json'), 'utf8')) as unknown;
}

export function buildDefaultContractFreeze(options: { generatedAt?: string } = {}): ContractFreeze {
  const input: ContractFreezeInput = { screens: loadScreenRegistry(), openapiDocument: loadOpenApiDocument() };
  if (options.generatedAt !== undefined) return buildContractFreeze({ ...input, generatedAt: options.generatedAt });
  return buildContractFreeze(input);
}
