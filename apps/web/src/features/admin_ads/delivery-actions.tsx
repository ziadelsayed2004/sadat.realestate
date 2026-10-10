import { useEffect, useState } from 'react';
import type { AdAdminRequest, AdRequest, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminAdsRequestDetailLoader } from './data.ts';
import type { AdminHomeSource } from '../admin_home/data.ts';
import { Button } from '../design_system/index.ts';
import { AdRequestSummary } from './request-summary.tsx';
import { RequestCreatives } from './request-creatives.tsx';

export function AdDeliveryActions({ requestId, providerId, locale, request, loadRequest, bannerSource }: {
  readonly requestId: AdRequest['id']; readonly providerId: AdRequest['providerId']; readonly locale: SupportedLocale;
  readonly request?: AdAdminRequest | undefined; readonly loadRequest: AdminAdsRequestDetailLoader; readonly bannerSource: AdminHomeSource;
}) {
  const ar = locale === 'ar';
  const [loaded, setLoaded] = useState<AdAdminRequest>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (request) return;
    const controller = new AbortController(); setLoaded(undefined); setFailed(false);
    void loadRequest(requestId, controller.signal).then(data => { if (!controller.signal.aborted) setLoaded(data); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [request, requestId, loadRequest, attempt]);
  const data = request ?? loaded;
  const canPrepare = Boolean(data?.request.placementKey && data.request.intervalStart && data.request.intervalEnd && ['waiting_payment', 'scheduled', 'active'].includes(data.request.status));
  const featured = data?.request.placementKey === 'homepage.featured';
  const editor = featured ? '/admin/ads/featured' : '/admin/banners/new';
  return <section className="admin-ads__review-card admin-ads__delivery" aria-label={ar ? 'تجهيز الإعلان ونشره' : 'Prepare and publish'}>
    <h3>{ar ? '٣. تجهيز الإعلان ونشره' : '3. Prepare and publish'}</h3>
    {!request && data ? <AdRequestSummary data={data} locale={locale} /> : null}
    {failed ? <div role="alert"><p>{ar ? 'تعذر تحميل الطلب.' : 'Could not load the request.'}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div> : !data ? <p role="status">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p> : null}
    <p>{ar ? 'اتفق مع العميل على الصورة والصفحة المطلوبة، ثم جهّز الإعلان. النشر مرتبط باعتماد الدفع وموعد العرض.' : 'Confirm the image and destination with the customer, then prepare the ad. Publication requires approved payment and a display schedule.'}</p>
    {canPrepare ? <a className="ui-button ui-button--primary" href={`${editor}?requestId=${requestId}&lang=${locale}`}>{ar ? featured ? 'تجهيز الكارت المميز' : 'تجهيز صورة البانر ورابطه' : featured ? 'Prepare featured card' : 'Prepare banner image and link'}</a> : <p>{ar ? 'حدد مكان العرض ومواعيده أولًا من السعر والدفع.' : 'Assign the placement and dates under Price and payment first.'}</p>}
    <details><summary>{ar ? 'الصور المحفوظة وحساب المعلن' : 'Saved images and advertiser account'}</summary><RequestCreatives requestId={requestId} locale={locale} source={bannerSource} /><a href={`/admin/providers/${providerId}?lang=${locale}`}>{ar ? 'فتح حساب المعلن' : 'Open advertiser account'}</a></details>
  </section>;
}
