import { useEffect, useState } from 'react';
import type { PropertyData, SupportedLocale } from '@sadat-real-estate/contracts';
import { buildApiUrl } from '../contracts/api-client.ts';
import type { AdminPropertiesAuthorizationSource } from './data.ts';

export function AdminPropertyCover({ property, locale, authorization, apiOrigin }: { readonly property: PropertyData; readonly locale: SupportedLocale; readonly authorization?: AdminPropertiesAuthorizationSource | undefined; readonly apiOrigin?: string | undefined }) {
  const mediaId = property.imageUrl?.match(/\/media\/([a-f\d]{24})\/content(?:\?|$)/u)?.[1];
  const [failedUrl, setFailedUrl] = useState<string>();
  const label = property.name[locale] ?? property.name.ar ?? property.name.en ?? property.slug;
  if (mediaId) return <AdminPropertyPhoto propertyId={property.id} mediaId={mediaId} filename={label} locale={locale} authorization={authorization} apiOrigin={apiOrigin} />;
  return property.imageUrl && failedUrl !== property.imageUrl ? <img className="admin-property-editor__image" src={property.imageUrl} alt={label} loading="lazy" onError={() => setFailedUrl(property.imageUrl)} /> : <div className="admin-property-editor__image admin-property-editor__image-state">{locale === 'ar' ? 'لا توجد صورة متاحة' : 'No image available'}</div>;
}

export function AdminPropertyPhoto({ propertyId, mediaId, filename, locale, authorization, apiOrigin }: { readonly propertyId: string; readonly mediaId: string; readonly filename: string; readonly locale: SupportedLocale; readonly authorization?: AdminPropertiesAuthorizationSource | undefined; readonly apiOrigin?: string | undefined }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setUrl(undefined); setFailed(false);
    const token = authorization?.getAuthorizationHeader();
    void fetch(buildApiUrl(apiOrigin, `/admin/properties/${propertyId}/media/${mediaId}/content`), { credentials: 'include', headers: token ? { authorization: token } : {}, signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('IMAGE_PREVIEW_FAILED');
      const blob = await response.blob();
      if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [apiOrigin, authorization, mediaId, propertyId]);
  return url && !failed ? <img className="admin-property-editor__image" src={url} alt={filename} onError={() => setFailed(true)} /> : <div className="admin-property-editor__image admin-property-editor__image-state">{failed ? (locale === 'ar' ? 'تعذرت معاينة الصورة' : 'Image preview unavailable') : (locale === 'ar' ? 'جارٍ تحميل الصورة…' : 'Loading image…')}</div>;
}
