import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { buildApiUrl } from '../contracts/api-client.ts';
import { Button } from '../design_system/index.ts';
import type { AdminPropertiesAuthorizationSource } from './data.ts';

export default function AdminPropertyVideo({ propertyId, mediaId, filename, locale, authorization, apiOrigin }: { readonly propertyId: string; readonly mediaId: string; readonly filename: string; readonly locale: SupportedLocale; readonly authorization?: AdminPropertiesAuthorizationSource | undefined; readonly apiOrigin?: string | undefined }) {
  const ar = locale === 'ar';
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setUrl(undefined); setFailed(false);
    const token = authorization?.getAuthorizationHeader();
    void fetch(buildApiUrl(apiOrigin, `/admin/properties/${propertyId}/media/${mediaId}/content`), { credentials: 'include', headers: token ? { authorization: token } : {}, signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('VIDEO_PREVIEW_FAILED');
      const blob = await response.blob();
      if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [apiOrigin, authorization, mediaId, propertyId, attempt]);
  return <div>
    {url && !failed ? <video className="admin-property-editor__image" src={url} controls playsInline preload="metadata" aria-label={filename} onError={() => setFailed(true)} /> : <p role={failed ? 'alert' : 'status'}>{failed ? (ar ? 'تعذر تشغيل الفيديو. أعد المحاولة أو نزّله لتشغيله على جهازك إذا كان الرابط متاحًا.' : 'Video could not play. Retry or download it to play on your device if the link is available.') : (ar ? 'جارٍ تحميل الفيديو…' : 'Loading video…')}</p>}
    {failed ? <Button type="button" size="sm" variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الفيديو' : 'Reload video'}</Button> : null}
    {url ? <a href={url} download={filename}>{ar ? 'تنزيل الفيديو' : 'Download video'}</a> : null}
  </div>;
}
