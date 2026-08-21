import {
  adBannerCreateSchema,
  adBannerIdParamsSchema,
  adBannerListDataSchema,
  adBannerListQuerySchema,
  adBannerListSuccessEnvelopeSchema,
  adBannerMediaCreateSchema,
  adBannerMediaDeleteSchema,
  adBannerMediaIdParamsSchema,
  adBannerMediaListDataSchema,
  adBannerMediaListSuccessEnvelopeSchema,
  adBannerMediaPatchSchema,
  adBannerMediaSuccessEnvelopeSchema,
  adBannerOrderSchema,
  adBannerOrderSuccessEnvelopeSchema,
  adBannerPatchSchema,
  adBannerPreviewSuccessEnvelopeSchema,
  adBannerSuccessEnvelopeSchema,
  cmsAdminContentNamespaceSchema,
  cmsAdminContentSuccessEnvelopeSchema,
  cmsAdminDisplaySettingPutSchema,
  cmsAdminHomepageSectionPutSchema,
  cmsAdminTipPutSchema,
  type AdBanner,
  type AdBannerCreate,
  type AdBannerListData,
  type AdBannerListQuery,
  type AdBannerMedia,
  type AdBannerMediaCreate,
  type AdBannerMediaDelete,
  type AdBannerMediaPatch,
  type AdBannerOrder,
  type AdBannerPreview,
  type AdBannerPatch,
  type CmsAdminContentData,
  type CmsAdminContentNamespace
} from '@sadat-real-estate/contracts';
import { ApiClient, type ApiClientOptions } from '../contracts/index.ts';

export const ADMIN_BANNERS_ROUTE = '/admin/banners' as const;
export const ADMIN_BANNER_MEDIA_ROUTE = '/admin/banner-media' as const;
export const ADMIN_CMS_TIPS_ROUTE = '/admin/content/tips' as const;
export const ADMIN_CMS_HOMEPAGE_ROUTE = '/admin/content/homepage' as const;

export type AdminHomeCmsNamespace = Extract<CmsAdminContentNamespace, 'tips' | 'homepage' | 'display'>;

export interface AdminHomeAuthorizationSource {
  readonly getAuthorizationHeader: () => string | undefined;
}

interface CommonOptions {
  readonly apiClient?: ApiClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly authorization?: AdminHomeAuthorizationSource | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface AdminBannerLoadOptions extends CommonOptions {
  readonly query?: Partial<AdBannerListQuery> | undefined;
}

export type AdminHomeCmsContent = Extract<CmsAdminContentData, { namespace: AdminHomeCmsNamespace }>;

function clientFor(options: Pick<CommonOptions, 'apiClient' | 'apiOrigin'>): ApiClient {
  if (options.apiClient !== undefined) return options.apiClient;
  const clientOptions: ApiClientOptions = options.apiOrigin === undefined ? {} : { baseUrl: options.apiOrigin };
  return new ApiClient(clientOptions);
}

function requestOptions(options: CommonOptions): { readonly headers?: HeadersInit; readonly signal?: AbortSignal } {
  const authorization = options.authorization?.getAuthorizationHeader();
  return {
    ...(authorization === undefined ? {} : { headers: { authorization } }),
    ...(options.signal === undefined ? {} : { signal: options.signal })
  };
}

function bannerId(value: string): string {
  return adBannerIdParamsSchema.parse({ bannerId: value }).bannerId;
}

function mediaId(value: string): string {
  return adBannerMediaIdParamsSchema.parse({ mediaId: value }).mediaId;
}

function cmsNamespace(value: AdminHomeCmsNamespace): AdminHomeCmsNamespace {
  return cmsAdminContentNamespaceSchema.parse(value) as AdminHomeCmsNamespace;
}

export async function loadAdminBanners(options: AdminBannerLoadOptions = {}): Promise<AdBannerListData> {
  const query = adBannerListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  const response = await clientFor(options).request(ADMIN_BANNERS_ROUTE, {
    responseSchema: adBannerListSuccessEnvelopeSchema,
    query,
    ...requestOptions(options)
  });
  return adBannerListDataSchema.parse(response.data.data);
}

export async function createAdminBanner(input: unknown, options: CommonOptions = {}): Promise<AdBanner> {
  const body = adBannerCreateSchema.parse(input);
  const response = await clientFor(options).request(ADMIN_BANNERS_ROUTE, {
    method: 'POST',
    responseSchema: adBannerSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function updateAdminBanner(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBanner> {
  const body = adBannerPatchSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}`, {
    method: 'PATCH',
    responseSchema: adBannerSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function previewAdminBanner(id: string, options: CommonOptions = {}): Promise<AdBannerPreview> {
  const response = await clientFor(options).request(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}/preview`, {
    responseSchema: adBannerPreviewSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminBannerMedia(id: string, options: CommonOptions = {}): Promise<readonly AdBannerMedia[]> {
  const response = await clientFor(options).request(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}/media`, {
    responseSchema: adBannerMediaListSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return adBannerMediaListDataSchema.parse(response.data.data).items;
}

export async function createAdminBannerMedia(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBannerMedia> {
  const body = adBannerMediaCreateSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}/media`, {
    method: 'POST',
    responseSchema: adBannerMediaSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function updateAdminBannerMedia(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBannerMedia> {
  const body = adBannerMediaPatchSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_BANNER_MEDIA_ROUTE}/${mediaId(id)}`, {
    method: 'PATCH',
    responseSchema: adBannerMediaSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function deleteAdminBannerMedia(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBannerMedia> {
  const body = adBannerMediaDeleteSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_BANNER_MEDIA_ROUTE}/${mediaId(id)}`, {
    method: 'DELETE',
    responseSchema: adBannerMediaSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function reorderAdminBanners(input: unknown, options: CommonOptions = {}): Promise<readonly AdBanner[]> {
  const body = adBannerOrderSchema.parse(input);
  const response = await clientFor(options).request(`${ADMIN_BANNERS_ROUTE}/order`, {
    method: 'POST',
    responseSchema: adBannerOrderSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data;
}

export async function loadAdminHomeContent(namespace: AdminHomeCmsNamespace, options: CommonOptions = {}): Promise<AdminHomeCmsContent> {
  const parsedNamespace = cmsNamespace(namespace);
  const response = await clientFor(options).request(`/admin/content/${parsedNamespace}`, {
    responseSchema: cmsAdminContentSuccessEnvelopeSchema,
    ...requestOptions(options)
  });
  return response.data.data as AdminHomeCmsContent;
}

function cmsPutSchema(namespace: AdminHomeCmsNamespace) {
  if (namespace === 'tips') return cmsAdminTipPutSchema;
  if (namespace === 'homepage') return cmsAdminHomepageSectionPutSchema;
  return cmsAdminDisplaySettingPutSchema;
}

export async function updateAdminHomeContent(namespace: AdminHomeCmsNamespace, input: unknown, options: CommonOptions = {}): Promise<AdminHomeCmsContent> {
  const parsedNamespace = cmsNamespace(namespace);
  const body = cmsPutSchema(parsedNamespace).parse(input);
  const response = await clientFor(options).request(`/admin/content/${parsedNamespace}`, {
    method: 'PUT',
    responseSchema: cmsAdminContentSuccessEnvelopeSchema,
    json: body,
    ...requestOptions(options)
  });
  return response.data.data as AdminHomeCmsContent;
}

export function createAdminHomeSource(options: Omit<CommonOptions, 'signal'> = {}) {
  return {
    loadBanners: (query: AdBannerListQuery, signal?: AbortSignal) => loadAdminBanners({ ...options, query, ...(signal === undefined ? {} : { signal }) }),
    createBanner: (input: AdBannerCreate, signal?: AbortSignal) => createAdminBanner(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateBanner: (id: string, input: AdBannerPatch, signal?: AbortSignal) => updateAdminBanner(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    previewBanner: (id: string, signal?: AbortSignal) => previewAdminBanner(id, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadBannerMedia: (id: string, signal?: AbortSignal) => loadAdminBannerMedia(id, { ...options, ...(signal === undefined ? {} : { signal }) }),
    createBannerMedia: (id: string, input: AdBannerMediaCreate, signal?: AbortSignal) => createAdminBannerMedia(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateBannerMedia: (id: string, input: AdBannerMediaPatch, signal?: AbortSignal) => updateAdminBannerMedia(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    deleteBannerMedia: (id: string, input: AdBannerMediaDelete, signal?: AbortSignal) => deleteAdminBannerMedia(id, input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    reorderBanners: (input: AdBannerOrder, signal?: AbortSignal) => reorderAdminBanners(input, { ...options, ...(signal === undefined ? {} : { signal }) }),
    loadContent: (namespace: AdminHomeCmsNamespace, signal?: AbortSignal) => loadAdminHomeContent(namespace, { ...options, ...(signal === undefined ? {} : { signal }) }),
    updateContent: (namespace: AdminHomeCmsNamespace, input: unknown, signal?: AbortSignal) => updateAdminHomeContent(namespace, input, { ...options, ...(signal === undefined ? {} : { signal }) })
  };
}

export type AdminHomeSource = ReturnType<typeof createAdminHomeSource>;
