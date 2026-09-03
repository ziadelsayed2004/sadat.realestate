import {
  propertyCoreStepSchema,
  propertyCreateSchema,
  propertyDataSchema,
  propertyDetailsStepSchema,
  propertyFeaturesServicesStepSchema,
  propertyLocationStepSchema,
  propertyContactStepSchema,
  propertyPricingStepSchema,
  propertyMediaOrderSchema,
  propertyMediaSuccessEnvelopeSchema,
  propertyMediaListSuccessEnvelopeSchema,
  propertyMediaUploadHeadersSchema,
  publicPropertyListSuccessEnvelopeSchema,
  propertySubmitSchema,
  successEnvelopeSchema,
  type PropertyCoreStep,
  type PropertyCreate,
  type PropertyData,
  type PropertyDetailsStep,
  type PropertyFeaturesServicesStep,
  type PropertyLocationStep,
  type PropertyPricingStep,
  type PropertyContactStep,
  type PropertyMediaData,
  type PropertyMediaKind,
  type PropertyMediaMime,
  type PropertyMediaOrder,
  type PropertySubmit,
  type PublicHomepageCategory,
  type PublicPropertyLocation
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from '../provider/data.ts';

export const PROVIDER_PROPERTY_ROUTE = '/provider/properties' as const;
export const PUBLIC_PROPERTY_CATALOG_ROUTE = '/public/properties' as const;

const MEDIA_FILENAME_EXTENSIONS: Readonly<Record<PropertyMediaMime, readonly string[]>> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

export type ProviderPropertyStep = 'basic' | 'location' | 'details' | 'price-payment' | 'features-services' | 'contact';

export interface ProviderPropertyRequestOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: ProviderAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface ProviderPropertyLoadOptions extends ProviderPropertyRequestOptions {
  readonly propertyId: string;
}

export type ProviderPropertyCreateOptions = ProviderPropertyRequestOptions;

export interface ProviderPropertyStepSaveOptions extends ProviderPropertyRequestOptions {
  readonly propertyId: string;
  readonly step: ProviderPropertyStep;
}

export interface ProviderPropertyMediaUploadOptions extends ProviderPropertyRequestOptions {
  readonly propertyId: string;
  readonly file: Blob;
  readonly filename: string;
  readonly kind: PropertyMediaKind;
  readonly contentType: PropertyMediaMime;
}

export interface ProviderPropertyMediaOrderOptions extends ProviderPropertyRequestOptions {
  readonly propertyId: string;
  readonly input: PropertyMediaOrder;
}

export interface ProviderPropertyMediaDeleteOptions extends ProviderPropertyRequestOptions {
  readonly propertyId: string;
  readonly mediaId: string;
}

export interface ProviderPropertySubmitOptions extends ProviderPropertyRequestOptions {
  readonly propertyId: string;
}

export type ProviderPropertyCreate = PropertyCreate;
export type ProviderPropertyLocationOption = PublicPropertyLocation;
export type ProviderPropertyTypeOption = PublicHomepageCategory;
export type ProviderPropertyStepInput = PropertyCoreStep | PropertyLocationStep | PropertyDetailsStep | PropertyPricingStep | PropertyFeaturesServicesStep | PropertyContactStep;

function clientFor(options: Pick<ProviderPropertyRequestOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function authorizationHeaders(source: ProviderAuthorizationSource | undefined): HeadersInit | undefined {
  const authorization = source?.getAuthorizationHeader();
  return authorization === undefined ? undefined : { authorization };
}

function propertyPath(propertyId: string): string {
  return `${PROVIDER_PROPERTY_ROUTE}/${encodeURIComponent(propertyId)}`;
}

export async function loadProviderPropertyLocations(options: ProviderPropertyRequestOptions = {}): Promise<readonly ProviderPropertyLocationOption[]> {
  const client = clientFor(options);
  const response = await client.request(PUBLIC_PROPERTY_CATALOG_ROUTE, {
    responseSchema: publicPropertyListSuccessEnvelopeSchema,
    query: { page: 1, limit: 1 },
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data.locations ?? [];
}

export async function loadProviderPropertyTypes(options: ProviderPropertyRequestOptions = {}): Promise<readonly ProviderPropertyTypeOption[]> {
  const client = clientFor(options);
  const response = await client.request(PUBLIC_PROPERTY_CATALOG_ROUTE, {
    responseSchema: publicPropertyListSuccessEnvelopeSchema,
    query: { page: 1, limit: 1 },
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data.propertyTypes;
}

function safeMediaFilename(filename: string, contentType: PropertyMediaMime, kind: PropertyMediaKind): string {
  const normalized = filename.trim();
  const extensionStart = normalized.lastIndexOf('.');
  const extension = extensionStart < 0 ? '' : normalized.slice(extensionStart).toLowerCase();
  const filenameIsSafe = normalized.length > 0
    && normalized.length <= 120
    && !/[\\/\u0000-\u001f\u007f]/u.test(normalized)
    && MEDIA_FILENAME_EXTENSIONS[contentType].includes(extension);
  const kindMatchesMime = kind === 'floor_plan' ? contentType === 'application/pdf' : contentType !== 'application/pdf';
  if (!filenameIsSafe || !kindMatchesMime) throw new Error('Invalid property media filename or type');
  return normalized;
}

export async function createProviderProperty(
  input: ProviderPropertyCreate,
  options: ProviderPropertyCreateOptions = {}
): Promise<PropertyData> {
  const client = clientFor(options);
  const request = propertyCreateSchema.parse(input);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(PROVIDER_PROPERTY_ROUTE, {
    method: 'POST',
    json: request,
    responseSchema: successEnvelopeSchema(propertyDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function loadProviderProperty(options: ProviderPropertyLoadOptions): Promise<PropertyData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(propertyPath(options.propertyId), {
    method: 'GET',
    responseSchema: successEnvelopeSchema(propertyDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function saveProviderPropertyStep(
  input: ProviderPropertyStepInput,
  options: ProviderPropertyStepSaveOptions
): Promise<PropertyData> {
  const client = clientFor(options);
  const request = options.step === 'basic'
    ? propertyCoreStepSchema.parse(input)
    : options.step === 'location'
      ? propertyLocationStepSchema.parse(input)
      : options.step === 'details'
        ? propertyDetailsStepSchema.parse(input)
        : options.step === 'price-payment'
        ? propertyPricingStepSchema.parse(input)
          : options.step === 'features-services'
            ? propertyFeaturesServicesStepSchema.parse(input)
            : propertyContactStepSchema.parse(input);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(`${propertyPath(options.propertyId)}/steps/${options.step}`, {
    method: 'PATCH',
    json: request,
    responseSchema: successEnvelopeSchema(propertyDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function uploadProviderPropertyMedia(options: ProviderPropertyMediaUploadOptions): Promise<PropertyMediaData> {
  const client = clientFor(options);
  const filename = safeMediaFilename(options.filename, options.contentType, options.kind);
  const headersInput = propertyMediaUploadHeadersSchema.parse({
    kind: options.kind,
    filename,
    contentType: options.contentType,
    contentLength: options.file.size
  });
  const authorization = authorizationHeaders(options.authorization);
  const headers: HeadersInit = {
    ...(authorization ?? {}),
    'content-type': headersInput.contentType,
    'x-media-kind': headersInput.kind,
    'x-file-name': headersInput.filename
  };
  const response = await client.request(`${propertyPath(options.propertyId)}/media`, {
    method: 'POST',
    body: options.file,
    headers,
    responseSchema: propertyMediaSuccessEnvelopeSchema,
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function reorderProviderPropertyMedia(options: ProviderPropertyMediaOrderOptions): Promise<readonly PropertyMediaData[]> {
  const client = clientFor(options);
  const request = propertyMediaOrderSchema.parse(options.input);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(`${propertyPath(options.propertyId)}/media/order`, {
    method: 'PATCH',
    json: request,
    responseSchema: propertyMediaListSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data.items;
}

export async function deleteProviderPropertyMedia(options: ProviderPropertyMediaDeleteOptions): Promise<PropertyMediaData> {
  const client = clientFor(options);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(`${propertyPath(options.propertyId)}/media/${encodeURIComponent(options.mediaId)}`, {
    method: 'DELETE',
    responseSchema: propertyMediaSuccessEnvelopeSchema,
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}

export async function submitProviderProperty(input: PropertySubmit, options: ProviderPropertySubmitOptions): Promise<PropertyData> {
  const client = clientFor(options);
  const request = propertySubmitSchema.parse(input);
  const headers = authorizationHeaders(options.authorization);
  const response = await client.request(`${propertyPath(options.propertyId)}/submit`, {
    method: 'POST',
    json: request,
    responseSchema: successEnvelopeSchema(propertyDataSchema),
    ...(headers === undefined ? {} : { headers }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  });
  return response.data.data;
}
