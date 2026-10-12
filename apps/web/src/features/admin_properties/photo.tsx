import { useEffect, useRef, useState } from 'react';
import type { PropertyData, SupportedLocale } from '@sadat-real-estate/contracts';
import { buildApiUrl } from '../contracts/api-client.ts';
import { Button } from '../design_system/index.ts';
import type { AdminPropertiesAuthorizationSource } from './data.ts';

export function AdminPropertyCover({ property, locale, authorization, apiOrigin }: { readonly property: PropertyData; readonly locale: SupportedLocale; readonly authorization?: AdminPropertiesAuthorizationSource | undefined; readonly apiOrigin?: string | undefined }) {
  const mediaId = property.imageUrl?.match(/\/media\/([a-f\d]{24})\/content(?:\?|$)/u)?.[1];
  const [failedUrl, setFailedUrl] = useState<string>();
  const label = property.name[locale] ?? property.name.ar ?? property.name.en ?? property.slug;
  if (mediaId) return <AdminPropertyPhoto propertyId={property.id} mediaId={mediaId} filename={label} locale={locale} authorization={authorization} apiOrigin={apiOrigin} width={320} />;
  return property.imageUrl && failedUrl !== property.imageUrl ? <img className="admin-property-editor__image" src={property.imageUrl} alt={label} loading="lazy" onError={() => setFailedUrl(property.imageUrl)} /> : <div className="admin-property-editor__image admin-property-editor__image-state">{locale === 'ar' ? 'لا توجد صورة متاحة' : 'No image available'}</div>;
}

export function AdminPropertyPhoto({ propertyId, mediaId, filename, locale, authorization, apiOrigin, width = 1600 }: { readonly propertyId: string; readonly mediaId: string; readonly filename: string; readonly locale: SupportedLocale; readonly authorization?: AdminPropertiesAuthorizationSource | undefined; readonly apiOrigin?: string | undefined; readonly width?: 320 | 1600 | undefined }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const token = authorization?.getAuthorizationHeader();
  const authorizationRef = useRef(authorization);
  authorizationRef.current = authorization;
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); setFailed(true); }, 15_000);
    let cancelled = false;
    let objectUrl: string | undefined;
    setUrl(undefined); setFailed(false);
    async function load(): Promise<void> {
      for (let retry = 0; retry < 2; retry++) {
        let response: Response;
        try {
          const currentToken = authorizationRef.current?.getAuthorizationHeader();
          response = await fetch(buildApiUrl(apiOrigin, `/admin/properties/${propertyId}/media/${mediaId}/content?width=${width}`), { credentials: 'include', cache: attempt > 0 ? 'reload' : 'default', headers: currentToken ? { authorization: currentToken } : {}, signal: controller.signal });
        } catch (error) {
          if (retry === 0 && !controller.signal.aborted) continue;
          throw error;
        }
        if (!response.ok) {
          if (retry === 0 && response.status === 401 && authorizationRef.current?.refresh) { await response.body?.cancel(); await authorizationRef.current.refresh(); continue; }
          if (retry === 0 && response.status >= 500) { await response.body?.cancel(); continue; }
          throw new Error('IMAGE_PREVIEW_FAILED');
        }
        const blob = await response.blob();
        if (blob.size === 0 || !blob.type.startsWith('image/')) throw new Error('IMAGE_PREVIEW_FAILED');
        if (!cancelled && !controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
        return;
      }
    }
    void load().catch(() => { if (!cancelled) setFailed(true); }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [apiOrigin, token, mediaId, propertyId, attempt, width]);
  return url && !failed ? <img className="admin-property-editor__image" src={url} alt={filename} decoding="async" onError={() => setFailed(true)} /> : <div className="admin-property-editor__image admin-property-editor__image-state" aria-live="polite">{failed ? <><span>{locale === 'ar' ? 'تعذرت معاينة الصورة' : 'Image preview unavailable'}</span><Button type="button" variant="secondary" size="xs" aria-label={`${locale === 'ar' ? 'إعادة تحميل الصورة' : 'Retry image'}: ${filename}`} onClick={() => setAttempt(value => value + 1)}>{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}</Button></> : (locale === 'ar' ? 'جارٍ تحميل الصورة…' : 'Loading image…')}</div>;
}
