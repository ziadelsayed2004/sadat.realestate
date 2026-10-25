import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { buildApiUrl } from '../contracts/api-client.ts';
import { Button } from '../design_system/index.ts';
import type { AdminPropertiesAuthorizationSource } from './data.ts';

export default function AdminPropertyVideo({ propertyId, mediaId, filename, locale, authorization, apiOrigin, kind = 'video' }: { readonly propertyId: string; readonly mediaId: string; readonly filename: string; readonly locale: SupportedLocale; readonly authorization?: AdminPropertiesAuthorizationSource | undefined; readonly apiOrigin?: string | undefined; readonly kind?: 'video' | 'floor_plan' }) {
  const ar = locale === 'ar';
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setUrl(undefined); setFailed(false);
    const load = () => { const token = authorization?.getAuthorizationHeader(); return fetch(buildApiUrl(apiOrigin, `/admin/properties/${propertyId}/media/${mediaId}/content`), { credentials: 'include', headers: token ? { authorization: token } : {}, signal: controller.signal }); };
    void load().then(async response => {
      if (response.status === 401 && authorization?.refresh) { await authorization.refresh(); if (!controller.signal.aborted) response = await load(); }
      if (!response.ok) throw new Error('MEDIA_PREVIEW_FAILED');
      const blob = await response.blob();
      if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [apiOrigin, authorization, mediaId, propertyId, attempt]);
  if (kind === 'floor_plan') return <div className="admin-property-editor__floor-plan"><strong>PDF</strong><p>{ar ? 'مخطط توزيع العقار (اختياري): يوضح الغرف أو الأدوار، وليس خريطة الموقع.' : 'Optional property floor plan: rooms or floors, rather than a location map.'}</p>{url ? <><a href={url} target="_blank" rel="noopener noreferrer">{ar ? 'فتح المخطط' : 'Open floor plan'}</a> · <a href={url} download={filename}>{ar ? 'تنزيل PDF' : 'Download PDF'}</a></> : <p role="status">{ar ? 'جارٍ تحميل المخطط…' : 'Loading floor plan…'}</p>}{failed ? <Button type="button" variant="secondary" onClick={() => setAttempt(n => n + 1)}>{ar ? 'تعذر التحميل؛ أعد المحاولة' : 'Could not load; retry'}</Button> : null}</div>;
  return <div>
    {url && !failed ? <video className="admin-property-editor__image" src={url} controls playsInline preload="metadata" aria-label={filename} onError={() => setFailed(true)} /> : <p role={failed ? 'alert' : 'status'}>{failed ? (ar ? 'تعذر تشغيل الفيديو. أعد المحاولة أو نزّله لتشغيله على جهازك إذا كان الرابط متاحًا.' : 'Video could not play. Retry or download it to play on your device if the link is available.') : (ar ? 'جارٍ تحميل الفيديو…' : 'Loading video…')}</p>}
    {failed ? <Button type="button" size="sm" variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الفيديو' : 'Reload video'}</Button> : null}
    {url ? <a href={url} download={filename}>{ar ? 'تنزيل الفيديو' : 'Download video'}</a> : null}
  </div>;
}
