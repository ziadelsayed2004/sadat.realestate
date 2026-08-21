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
  type PropertySubmit
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';
import type { ProviderAuthorizationSource } from '../provider/data.ts';

export const PROVIDER_PROPERTY_ROUTE = '/provider/properties' as const;

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
  const headersInput = propertyMediaUploadHeadersSchema.parse({
    kind: options.kind,
    filename: options.filename,
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
