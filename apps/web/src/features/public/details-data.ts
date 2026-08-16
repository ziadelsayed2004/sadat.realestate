import {
  propertySlugSchema,
  publicPropertyDetailsSuccessEnvelopeSchema,
  requestCreateSchema,
  requestDataSchema,
  successEnvelopeSchema,
  viewingCreateSchema,
  viewingDataSchema,
  type PublicPropertyDetails,
  type RequestData,
  type SupportedLocale,
  type ViewingCreate,
  type ViewingData
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const PUBLIC_PROPERTY_DETAILS_ROUTE_PREFIX = '/public/properties' as const;
export const PUBLIC_PROPERTY_DETAILS_PATH_PREFIX = '/properties' as const;

export interface PublicPropertyDetailsLoadOptions {
  readonly slug: string;
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type PublicPropertyDetailsLoader = (
  slug: string,
  signal?: AbortSignal
) => Promise<PublicPropertyDetails>;

export interface PublicContactRequestInput {
  readonly message: string;
  readonly propertyId: string;
  readonly projectId?: string | undefined;
  readonly locale?: SupportedLocale | undefined;
}

export interface PublicPropertyDetailsActions {
  submitContact(input: PublicContactRequestInput): Promise<RequestData>;
  submitViewing(input: ViewingCreate): Promise<ViewingData>;
}

export interface PublicPropertyDetailsActionOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorizationHeader?: string | undefined;
}

function clientFor(options: { readonly apiClient?: ApiClient | undefined; readonly apiOrigin?: string | undefined }): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function actionHeaders(options: PublicPropertyDetailsActionOptions): HeadersInit | undefined {
  return options.authorizationHeader === undefined ? undefined : { Authorization: options.authorizationHeader };
}

export function propertyDetailsSlugFromUrl(source: URL | string): string | undefined {
  const url = source instanceof URL ? source : new URL(source, 'http://sadat-real-estate.local');
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== PUBLIC_PROPERTY_DETAILS_PATH_PREFIX.slice(1)) return undefined;
  try {
    const parsed = propertySlugSchema.safeParse(decodeURIComponent(segments[1] ?? ''));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function publicPropertyDetailsUrl(slug: string): string {
  const parsedSlug = propertySlugSchema.parse(slug);
  return `${PUBLIC_PROPERTY_DETAILS_PATH_PREFIX}/${encodeURIComponent(parsedSlug)}`;
}

export async function loadPublicPropertyDetails(options: PublicPropertyDetailsLoadOptions): Promise<PublicPropertyDetails> {
  const slug = propertySlugSchema.parse(options.slug);
  const client = clientFor(options);
  const requestOptions = options.signal === undefined
    ? { responseSchema: publicPropertyDetailsSuccessEnvelopeSchema }
    : { responseSchema: publicPropertyDetailsSuccessEnvelopeSchema, signal: options.signal };
  const response = await client.request(`${PUBLIC_PROPERTY_DETAILS_ROUTE_PREFIX}/${encodeURIComponent(slug)}`, requestOptions);
  return response.data.data;
}

export function createPublicPropertyDetailsLoader(
  options: Omit<PublicPropertyDetailsLoadOptions, 'slug' | 'signal'> = {}
): PublicPropertyDetailsLoader {
  return (slug, signal) => loadPublicPropertyDetails({ ...options, slug, ...(signal === undefined ? {} : { signal }) });
}

export const defaultPublicPropertyDetailsLoader = createPublicPropertyDetailsLoader();

export function createPublicPropertyDetailsActions(options: PublicPropertyDetailsActionOptions = {}): PublicPropertyDetailsActions {
  const client = clientFor(options);
  const headers = actionHeaders(options);
  const requestResponseSchema = successEnvelopeSchema(requestDataSchema);
  const viewingResponseSchema = successEnvelopeSchema(viewingDataSchema);

  return {
    async submitContact(input) {
      const request = requestCreateSchema.parse({
        type: 'contact',
        payload: {
          message: input.message,
          propertyId: input.propertyId,
          ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
          ...(input.locale === undefined ? {} : { locale: input.locale })
        }
      });
      const response = await client.request('/seeker/contact-requests', {
        method: 'POST',
        ...(headers === undefined ? {} : { headers }),
        json: request,
        responseSchema: requestResponseSchema
      });
      return response.data.data;
    },
    async submitViewing(input) {
      const request = viewingCreateSchema.parse(input);
      const response = await client.request('/seeker/viewings', {
        method: 'POST',
        ...(headers === undefined ? {} : { headers }),
        json: request,
        responseSchema: viewingResponseSchema
      });
      return response.data.data;
    }
  };
}

export const defaultPublicPropertyDetailsActions = createPublicPropertyDetailsActions();
