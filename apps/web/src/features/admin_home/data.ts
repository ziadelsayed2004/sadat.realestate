import {
  adBannerCreateSchema,
  adBannerConfigSuccessEnvelopeSchema,
  adBannerConfigPutSchema,
  adBannerIdParamsSchema,
  adBannerListQuerySchema,
  adBannerListSuccessEnvelopeSchema,
  adBannerMediaCreateSchema,
  adBannerMediaDeleteSchema,
  adBannerMediaIdParamsSchema,
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
import { ApiClientError, type ApiClient, type ApiRequestOptions, type ContractSchema } from '../contracts/index.ts';
import { createAdminSessionClient as clientFor, adminSessionOptions as requestOptions, loadAdminAdRequest, type AdminAdsAuthorizationSource } from '../admin_ads/data.ts';

export const ADMIN_BANNERS_ROUTE = '/admin/banners' as const;
export const ADMIN_BANNER_MEDIA_ROUTE = '/admin/banner-media' as const;
export const ADMIN_CMS_TIPS_ROUTE = '/admin/content/tips' as const;
export const ADMIN_CMS_HOMEPAGE_ROUTE = '/admin/content/homepage' as const;

export type AdminHomeCmsNamespace = Extract<CmsAdminContentNamespace, 'tips' | 'homepage' | 'display'>;

export type AdminHomeAuthorizationSource = AdminAdsAuthorizationSource;

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

function bannerId(value: string): string {
  return adBannerIdParamsSchema.parse({ bannerId: value }).bannerId;
}

function mediaId(value: string): string {
  return adBannerMediaIdParamsSchema.parse({ mediaId: value }).mediaId;
}

function cmsNamespace(value: AdminHomeCmsNamespace): AdminHomeCmsNamespace {
  return cmsAdminContentNamespaceSchema.parse(value) as AdminHomeCmsNamespace;
}

async function homeRequest<T>(path: string, responseSchema: ContractSchema<{ data: T }>, options: CommonOptions, request: Omit<ApiRequestOptions<unknown>, 'responseSchema'> = {}): Promise<T> {
  return (await clientFor(options).request(path, { ...requestOptions(options), ...request, responseSchema })).data.data;
}

export async function loadAdminBanners(options: AdminBannerLoadOptions = {}): Promise<AdBannerListData> {
  const query = adBannerListQuerySchema.parse({ page: 1, limit: 20, ...options.query });
  return homeRequest(ADMIN_BANNERS_ROUTE, adBannerListSuccessEnvelopeSchema, options, { query });
}

export async function createAdminBanner(input: unknown, options: CommonOptions = {}): Promise<AdBanner> {
  return homeRequest(ADMIN_BANNERS_ROUTE, adBannerSuccessEnvelopeSchema, options, { method: 'POST', json: adBannerCreateSchema.parse(input) });
}

export async function updateAdminBanner(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBanner> {
  return homeRequest(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}`, adBannerSuccessEnvelopeSchema, options, { method: 'PATCH', json: adBannerPatchSchema.parse(input) });
}

export async function previewAdminBanner(id: string, options: CommonOptions = {}): Promise<AdBannerPreview> {
  return homeRequest(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}/preview`, adBannerPreviewSuccessEnvelopeSchema, options);
}

export async function loadAdminBannerMedia(id: string, options: CommonOptions = {}): Promise<readonly AdBannerMedia[]> {
  return (await homeRequest(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}/media`, adBannerMediaListSuccessEnvelopeSchema, options)).items;
}

export async function createAdminBannerMedia(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBannerMedia> {
  return homeRequest(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}/media`, adBannerMediaSuccessEnvelopeSchema, options, { method: 'POST', json: adBannerMediaCreateSchema.parse(input) });
}

export async function updateAdminBannerMedia(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBannerMedia> {
  return homeRequest(`${ADMIN_BANNER_MEDIA_ROUTE}/${mediaId(id)}`, adBannerMediaSuccessEnvelopeSchema, options, { method: 'PATCH', json: adBannerMediaPatchSchema.parse(input) });
}

export async function deleteAdminBannerMedia(id: string, input: unknown, options: CommonOptions = {}): Promise<AdBannerMedia> {
  return homeRequest(`${ADMIN_BANNER_MEDIA_ROUTE}/${mediaId(id)}`, adBannerMediaSuccessEnvelopeSchema, options, { method: 'DELETE', json: adBannerMediaDeleteSchema.parse(input) });
}

export async function reorderAdminBanners(input: unknown, options: CommonOptions = {}): Promise<readonly AdBanner[]> {
  return homeRequest(`${ADMIN_BANNERS_ROUTE}/order`, adBannerOrderSuccessEnvelopeSchema, options, { method: 'POST', json: adBannerOrderSchema.parse(input) });
}

export async function loadAdminHomeContent(namespace: AdminHomeCmsNamespace, options: CommonOptions = {}): Promise<AdminHomeCmsContent> {
  const parsedNamespace = cmsNamespace(namespace);
  return await homeRequest(`/admin/content/${parsedNamespace}`, cmsAdminContentSuccessEnvelopeSchema, options) as AdminHomeCmsContent;
}

function cmsPutSchema(namespace: AdminHomeCmsNamespace) {
  if (namespace === 'tips') return cmsAdminTipPutSchema;
  if (namespace === 'homepage') return cmsAdminHomepageSectionPutSchema;
  return cmsAdminDisplaySettingPutSchema;
}

export async function updateAdminHomeContent(namespace: AdminHomeCmsNamespace, input: unknown, options: CommonOptions = {}): Promise<AdminHomeCmsContent> {
  const parsedNamespace = cmsNamespace(namespace);
  return await homeRequest(`/admin/content/${parsedNamespace}`, cmsAdminContentSuccessEnvelopeSchema, options, { method: 'PUT', json: cmsPutSchema(parsedNamespace).parse(input) }) as AdminHomeCmsContent;
}

export function createAdminHomeSource(options: Omit<CommonOptions, 'signal'> = {}) {
  const withSignal = (signal?: AbortSignal) => ({ ...options, signal });
  const loadMediaBlob = async (url: string) => {
    if (!/^\/api\/v1\/public\/banner-media\/[a-f0-9]{24}$/u.test(url)) throw new Error('INVALID_BANNER_IMAGE');
    const origin = options.apiOrigin ? new URL(options.apiOrigin, window.location.origin).origin : window.location.origin;
    const request = () => fetch(`${origin}${url}`, { ...requestOptions(options), credentials: 'include', cache: 'no-store' });
    let response = await request();
    if (response.status === 401 && options.authorization?.refresh && options.authorization.getAuthorizationHeader()) {
      await options.authorization.refresh();
      response = await request();
    }
    if (!response.ok) throw new ApiClientError('Banner preview unavailable', { code: 'HTTP_ERROR', status: response.status });
    const blob = await response.blob();
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 10 * 1024 * 1024) throw new Error('INVALID_BANNER_IMAGE');
    return blob;
  };
  return {
    loadMediaBlob,
    loadAdRequest: (id: string, signal?: AbortSignal) => loadAdminAdRequest(id, withSignal(signal)),
    loadBannerConfig: () => homeRequest(`${ADMIN_BANNERS_ROUTE}/config`, adBannerConfigSuccessEnvelopeSchema, options),
    updateBannerConfig: (input: unknown) => homeRequest(`${ADMIN_BANNERS_ROUTE}/config`, adBannerConfigSuccessEnvelopeSchema, options, { method: 'PUT', json: adBannerConfigPutSchema.parse(input) }),
    uploadBannerImage: (id: string, file: File) => homeRequest(`${ADMIN_BANNERS_ROUTE}/${bannerId(id)}/upload`, adBannerMediaSuccessEnvelopeSchema, options, { method: 'POST', body: file, headers: { ...requestOptions(options).headers, 'content-type': file.type } }),
    loadMediaPreview: async (url: string) => {
      if (!/^\/api\/v1\/public\/banner-media\/[a-f0-9]{24}$/u.test(url)) return url;
      return URL.createObjectURL(await loadMediaBlob(url));
    },

    loadBanners: (query: AdBannerListQuery, signal?: AbortSignal) => loadAdminBanners({ ...withSignal(signal), query }),
    createBanner: (input: AdBannerCreate, signal?: AbortSignal) => createAdminBanner(input, withSignal(signal)),
    updateBanner: (id: string, input: AdBannerPatch, signal?: AbortSignal) => updateAdminBanner(id, input, withSignal(signal)),
    previewBanner: (id: string, signal?: AbortSignal) => previewAdminBanner(id, withSignal(signal)),
    loadBannerMedia: (id: string, signal?: AbortSignal) => loadAdminBannerMedia(id, withSignal(signal)),
    createBannerMedia: (id: string, input: AdBannerMediaCreate, signal?: AbortSignal) => createAdminBannerMedia(id, input, withSignal(signal)),
    updateBannerMedia: (id: string, input: AdBannerMediaPatch, signal?: AbortSignal) => updateAdminBannerMedia(id, input, withSignal(signal)),
    deleteBannerMedia: (id: string, input: AdBannerMediaDelete, signal?: AbortSignal) => deleteAdminBannerMedia(id, input, withSignal(signal)),
    reorderBanners: (input: AdBannerOrder, signal?: AbortSignal) => reorderAdminBanners(input, withSignal(signal)),
    loadContent: (namespace: AdminHomeCmsNamespace, signal?: AbortSignal) => loadAdminHomeContent(namespace, withSignal(signal)),
    updateContent: (namespace: AdminHomeCmsNamespace, input: unknown, signal?: AbortSignal) => updateAdminHomeContent(namespace, input, withSignal(signal))
  };
}

export type AdminHomeSource = ReturnType<typeof createAdminHomeSource>;
