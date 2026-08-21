import {
  propertyAdminListQuerySchema,
  propertyDataSchema,
  propertyDuplicateDataSchema,
  propertyDuplicateQuerySchema,
  propertyIdParamsSchema,
  propertyListDataSchema,
  propertyReportDataSchema,
  propertyReportIdParamsSchema,
  propertyReportListDataSchema,
  propertyReportListQuerySchema,
  propertyReportResolveSchema,
  propertyReviewSchema,
  propertyVisibilitySchema,
  successEnvelopeSchema,
  type PropertyAdminListQuery,
  type PropertyData,
  type PropertyDuplicateData,
  type PropertyDuplicateQuery,
  type PropertyReportData,
  type PropertyReportListData,
  type PropertyReportListQuery,
  type PropertyReportResolve,
  type PropertyReview,
  type PropertyVisibility
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_PROPERTIES_ROUTE = '/admin/properties' as const;
export const ADMIN_PROPERTY_REVIEW_ROUTE = '/admin/properties/review' as const;
export const ADMIN_PROPERTY_DUPLICATES_ROUTE = '/admin/properties/possible-duplicates' as const;
export const ADMIN_PROPERTY_REPORTS_ROUTE = '/admin/property-reports' as const;

const propertyListSuccessEnvelopeSchema = successEnvelopeSchema(propertyListDataSchema);
const propertySuccessEnvelopeSchema = successEnvelopeSchema(propertyDataSchema);
const propertyDuplicateSuccessEnvelopeSchema = successEnvelopeSchema(propertyDuplicateDataSchema);
const propertyReportListSuccessEnvelopeSchema = successEnvelopeSchema(propertyReportListDataSchema);
const propertyReportSuccessEnvelopeSchema = successEnvelopeSchema(propertyReportDataSchema);

export interface AdminPropertiesAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminPropertiesAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminPropertiesLoadOptions extends CommonOptions {
  readonly query?: Partial<PropertyAdminListQuery> | undefined;
}

export interface AdminPropertyReportsLoadOptions extends CommonOptions {
  readonly query?: Partial<PropertyReportListQuery> | undefined;
}

export interface AdminPropertyDuplicatesLoadOptions extends CommonOptions {
  readonly query?: Partial<Omit<PropertyDuplicateQuery, 'propertyId'>> | undefined;
}

export type AdminPropertyListData = PropertyListWithMeta;
export type AdminPropertiesLoader = (query: PropertyAdminListQuery, signal?: AbortSignal) => Promise<AdminPropertyListData>;
export type AdminPropertyLoader = (propertyId: string, signal?: AbortSignal) => Promise<PropertyData>;
export type AdminPropertyReviewMutation = (propertyId: string, input: PropertyReview, signal?: AbortSignal) => Promise<PropertyData>;
export type AdminPropertyVisibilityMutation = (propertyId: string, input: PropertyVisibility, signal?: AbortSignal) => Promise<PropertyData>;
export type AdminPropertyDuplicatesLoader = (propertyId: string, query?: Partial<Omit<PropertyDuplicateQuery, 'propertyId'>>, signal?: AbortSignal) => Promise<PropertyDuplicateData>;
export type AdminPropertyReportsLoader = (query: PropertyReportListQuery, signal?: AbortSignal) => Promise<PropertyReportListData>;
export type AdminPropertyReportResolver = (reportId: string, input: PropertyReportResolve, signal?: AbortSignal) => Promise<PropertyReportData>;

type PropertyListWithMeta = {
  readonly items: readonly PropertyData[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
};

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function headersFor(source: AdminPropertiesAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

export async function loadAdminProperties(options: AdminPropertiesLoadOptions = {}): Promise<AdminPropertyListData> {
  const query = propertyAdminListQuerySchema.parse({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc', ...options.query });
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_PROPERTIES_ROUTE, {
    responseSchema: propertyListSuccessEnvelopeSchema,
    query,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return {
    items: response.data.data.items,
    page: response.data.meta.page ?? query.page,
    limit: response.data.meta.limit ?? query.limit,
    total: response.data.meta.total ?? response.data.data.items.length
  };
}

export async function loadAdminProperty(propertyId: string, options: CommonOptions = {}): Promise<PropertyData> {
  const id = propertyIdParamsSchema.parse({ propertyId }).propertyId;
  const properties = await loadAdminProperties({ ...options, query: { page: 1, limit: 100, search: undefined } });
  const property = properties.items.find(item => item.id === id);
  if (property === undefined) throw new Error('PROPERTY_NOT_FOUND');
  return property;
}

export async function reviewAdminProperty(propertyId: string, input: PropertyReview, options: CommonOptions = {}): Promise<PropertyData> {
  const id = propertyIdParamsSchema.parse({ propertyId }).propertyId;
  const body = propertyReviewSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_PROPERTIES_ROUTE}/${id}/review`, {
    method: 'POST',
    responseSchema: propertySuccessEnvelopeSchema,
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function changeAdminPropertyVisibility(propertyId: string, input: PropertyVisibility, options: CommonOptions = {}): Promise<PropertyData> {
  const id = propertyIdParamsSchema.parse({ propertyId }).propertyId;
  const body = propertyVisibilitySchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_PROPERTIES_ROUTE}/${id}/visibility`, {
    method: 'POST',
    responseSchema: propertySuccessEnvelopeSchema,
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function loadAdminPropertyDuplicates(propertyId: string, options: AdminPropertyDuplicatesLoadOptions = {}): Promise<PropertyDuplicateData> {
  const id = propertyIdParamsSchema.parse({ propertyId }).propertyId;
  const query = propertyDuplicateQuerySchema.parse({ propertyId: id, limit: 20, ...options.query });
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_PROPERTY_DUPLICATES_ROUTE, {
    responseSchema: propertyDuplicateSuccessEnvelopeSchema,
    query,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function loadAdminPropertyReports(options: AdminPropertyReportsLoadOptions = {}): Promise<PropertyReportListData> {
  const query = propertyReportListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(ADMIN_PROPERTY_REPORTS_ROUTE, {
    responseSchema: propertyReportListSuccessEnvelopeSchema,
    query,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function resolveAdminPropertyReport(reportId: string, input: PropertyReportResolve, options: CommonOptions = {}): Promise<PropertyReportData> {
  const id = propertyReportIdParamsSchema.parse({ reportId }).reportId;
  const body = propertyReportResolveSchema.parse(input);
  const headers = headersFor(options.authorization);
  const response = await clientFor(options).request(`${ADMIN_PROPERTY_REPORTS_ROUTE}/${id}/resolve`, {
    method: 'POST',
    responseSchema: propertyReportSuccessEnvelopeSchema,
    json: body,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export function createAdminPropertiesLoader(options: Omit<AdminPropertiesLoadOptions, 'query' | 'signal'> = {}): AdminPropertiesLoader {
  return (query, signal) => loadAdminProperties({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminPropertyLoader(options: Omit<CommonOptions, 'signal'> = {}): AdminPropertyLoader {
  return (propertyId, signal) => loadAdminProperty(propertyId, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminPropertyReviewMutation(options: Omit<CommonOptions, 'signal'> = {}): AdminPropertyReviewMutation {
  return (propertyId, input, signal) => reviewAdminProperty(propertyId, input, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminPropertyVisibilityMutation(options: Omit<CommonOptions, 'signal'> = {}): AdminPropertyVisibilityMutation {
  return (propertyId, input, signal) => changeAdminPropertyVisibility(propertyId, input, { ...options, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminPropertyDuplicatesLoader(options: Omit<CommonOptions, 'signal'> = {}): AdminPropertyDuplicatesLoader {
  return (propertyId, query, signal) => loadAdminPropertyDuplicates(propertyId, { ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminPropertyReportsLoader(options: Omit<CommonOptions, 'signal'> = {}): AdminPropertyReportsLoader {
  return (query, signal) => loadAdminPropertyReports({ ...options, query, ...(signal === undefined ? {} : { signal }) });
}

export function createAdminPropertyReportResolver(options: Omit<CommonOptions, 'signal'> = {}): AdminPropertyReportResolver {
  return (reportId, input, signal) => resolveAdminPropertyReport(reportId, input, { ...options, ...(signal === undefined ? {} : { signal }) });
}
