import {
  featureCreateSchema,
  featureDeleteSchema,
  featureDeleteSuccessEnvelopeSchema,
  featureListQuerySchema,
  featureListSuccessEnvelopeSchema,
  featurePatchSchema,
  featureSuccessEnvelopeSchema,
  locationCreateRequestSchema,
  locationDeleteRequestSchema,
  locationDeleteSuccessEnvelopeSchema,
  locationListQuerySchema,
  locationListSuccessEnvelopeSchema,
  locationPatchRequestSchema,
  locationSuccessEnvelopeSchema,
  taxonomyCreateSchema,
  taxonomyDeleteSchema,
  taxonomyDeleteSuccessEnvelopeSchema,
  taxonomyListQuerySchema,
  taxonomyListSuccessEnvelopeSchema,
  taxonomyPatchSchema,
  taxonomySuccessEnvelopeSchema,
  type FeatureCreate,
  type FeatureData,
  type FeatureDeleteData,
  type FeaturePatch,
  type FeatureQuery,
  type LocationCreateRequest,
  type LocationData,
  type LocationDeleteData,
  type LocationListQuery,
  type LocationPatchRequest,
  type TaxonomyCreate,
  type TaxonomyData,
  type TaxonomyDelete,
  type TaxonomyPatch,
  type TaxonomyQuery,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { AdminMasterDataTab } from './copy.ts';

export const ADMIN_PROPERTY_CATEGORIES_ROUTE = '/admin/property-categories' as const;
export const ADMIN_LOCATIONS_ROUTE = '/admin/locations' as const;
export const ADMIN_FEATURES_ROUTE = '/admin/features' as const;

export interface AdminMasterDataAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminMasterDataAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminMasterDataLoadOptions extends CommonOptions {
  readonly query?: Partial<LocationListQuery | TaxonomyQuery | FeatureQuery> | undefined;
}

export type MasterDataItem = LocationData | TaxonomyData | FeatureData;
export type AdminMasterDataList<TItem> = {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
};
export type LocationList = AdminMasterDataList<LocationData>;
export type TaxonomyList = AdminMasterDataList<TaxonomyData>;
export type FeatureList = AdminMasterDataList<FeatureData>;
export type MasterDataList<TItem extends MasterDataItem = MasterDataItem> = AdminMasterDataList<TItem>;
export type MasterDataDelete = LocationDeleteData | FeatureDeleteData | { readonly id: string; readonly deleted: true };

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function headersFor(source: AdminMasterDataAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function listResult<TItem>(items: readonly TItem[], page: number | undefined, limit: number | undefined, total: number | undefined): AdminMasterDataList<TItem> {
  return { items, page: page ?? 1, limit: limit ?? 20, total: total ?? items.length };
}

export async function loadAdminLocations(options: AdminMasterDataLoadOptions = {}): Promise<LocationList> {
  const client = clientFor(options);
  const query = locationListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const headers = headersFor(options.authorization);
  const response = await client.request(ADMIN_LOCATIONS_ROUTE, { responseSchema: locationListSuccessEnvelopeSchema, query, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return listResult(response.data.data.items, response.data.meta.page, response.data.meta.limit, response.data.meta.total);
}

export async function loadAdminTaxonomy(options: AdminMasterDataLoadOptions = {}): Promise<TaxonomyList> {
  const client = clientFor(options);
  const query = taxonomyListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const headers = headersFor(options.authorization);
  const response = await client.request(ADMIN_PROPERTY_CATEGORIES_ROUTE, { responseSchema: taxonomyListSuccessEnvelopeSchema, query, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return listResult(response.data.data.items, response.data.meta.page, response.data.meta.limit, response.data.meta.total);
}

export async function loadAdminFeatures(options: AdminMasterDataLoadOptions = {}): Promise<FeatureList> {
  const client = clientFor(options);
  const query = featureListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const headers = headersFor(options.authorization);
  const response = await client.request(ADMIN_FEATURES_ROUTE, { responseSchema: featureListSuccessEnvelopeSchema, query, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return listResult(response.data.data.items, response.data.meta.page, response.data.meta.limit, response.data.meta.total);
}

export function loadAdminMasterData(tab: AdminMasterDataTab, options: AdminMasterDataLoadOptions = {}): Promise<MasterDataList> {
  if (tab === 'categories') return loadAdminTaxonomy(options);
  if (tab === 'locations') return loadAdminLocations(options);
  return loadAdminFeatures(options);
}

export async function createAdminLocation(input: unknown, options: CommonOptions = {}): Promise<LocationData> {
  const body: LocationCreateRequest = locationCreateRequestSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_LOCATIONS_ROUTE, { method: 'POST', responseSchema: locationSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function updateAdminLocation(locationId: string, input: unknown, options: CommonOptions = {}): Promise<LocationData> {
  const body: LocationPatchRequest = locationPatchRequestSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_LOCATIONS_ROUTE}/${locationId}`, { method: 'PATCH', responseSchema: locationSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function deleteAdminLocation(locationId: string, input: unknown, options: CommonOptions = {}): Promise<LocationDeleteData> {
  const body = locationDeleteRequestSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_LOCATIONS_ROUTE}/${locationId}`, { method: 'DELETE', responseSchema: locationDeleteSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function createAdminTaxonomy(input: unknown, options: CommonOptions = {}): Promise<TaxonomyData> {
  const body: TaxonomyCreate = taxonomyCreateSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_PROPERTY_CATEGORIES_ROUTE, { method: 'POST', responseSchema: taxonomySuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function updateAdminTaxonomy(categoryId: string, input: unknown, options: CommonOptions = {}): Promise<TaxonomyData> {
  const body: TaxonomyPatch = taxonomyPatchSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_PROPERTY_CATEGORIES_ROUTE}/${categoryId}`, { method: 'PATCH', responseSchema: taxonomySuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function deleteAdminTaxonomy(categoryId: string, input: unknown, options: CommonOptions = {}): Promise<{ readonly id: string; readonly deleted: true }> {
  const body: TaxonomyDelete = taxonomyDeleteSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_PROPERTY_CATEGORIES_ROUTE}/${categoryId}`, { method: 'DELETE', responseSchema: taxonomyDeleteSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function createAdminFeature(input: unknown, options: CommonOptions = {}): Promise<FeatureData> {
  const body: FeatureCreate = featureCreateSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_FEATURES_ROUTE, { method: 'POST', responseSchema: featureSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function updateAdminFeature(featureId: string, input: unknown, options: CommonOptions = {}): Promise<FeatureData> {
  const body: FeaturePatch = featurePatchSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_FEATURES_ROUTE}/${featureId}`, { method: 'PATCH', responseSchema: featureSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export async function deleteAdminFeature(featureId: string, input: unknown, options: CommonOptions = {}): Promise<{ readonly id: string; readonly deleted: true }> {
  const body = featureDeleteSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_FEATURES_ROUTE}/${featureId}`, { method: 'DELETE', responseSchema: featureDeleteSuccessEnvelopeSchema, json: body, ...(headers === undefined ? {} : { headers }), ...(options.signal === undefined ? {} : { signal: options.signal }) });
  return response.data.data;
}

export function createAdminMasterDataSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    load: (tab: AdminMasterDataTab, signal?: AbortSignal) => loadAdminMasterData(tab, { ...options, ...(signal === undefined ? {} : { signal }) }),
    createLocation: (input: unknown, signal?: AbortSignal) => createAdminLocation(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateLocation: (id: string, input: unknown, signal?: AbortSignal) => updateAdminLocation(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    deleteLocation: (id: string, input: unknown, signal?: AbortSignal) => deleteAdminLocation(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    createTaxonomy: (input: unknown, signal?: AbortSignal) => createAdminTaxonomy(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateTaxonomy: (id: string, input: unknown, signal?: AbortSignal) => updateAdminTaxonomy(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    deleteTaxonomy: (id: string, input: unknown, signal?: AbortSignal) => deleteAdminTaxonomy(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    createFeature: (input: unknown, signal?: AbortSignal) => createAdminFeature(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateFeature: (id: string, input: unknown, signal?: AbortSignal) => updateAdminFeature(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    deleteFeature: (id: string, input: unknown, signal?: AbortSignal) => deleteAdminFeature(id, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}

export type AdminMasterDataSource = ReturnType<typeof createAdminMasterDataSource>;
export type AdminMasterDataLocale = SupportedLocale;
