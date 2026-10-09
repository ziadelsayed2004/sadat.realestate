import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { buildApiUrl } from '../contracts/api-client.ts';
import type { AdminPropertiesAuthorizationSource } from './data.ts';

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
