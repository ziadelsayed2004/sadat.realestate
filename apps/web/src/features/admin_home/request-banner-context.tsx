import { useEffect, useState, type ReactNode } from 'react';
import type { AdAdminRequest, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminHomeSource } from './data.ts';
import { Button } from '../design_system/index.ts';
import { AdRequestSummary } from '../admin_ads/request-summary.tsx';

export function RequestBannerContext({ requestId, locale, source, render }: { readonly requestId: string; readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly render: (data: AdAdminRequest) => ReactNode }) {
  const ar = locale === 'ar';
  const [data, setData] = useState<AdAdminRequest>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(undefined); setFailed(false);
    if (!/^[a-f0-9]{24}$/u.test(requestId)) { setFailed(true); return; }
    void source.loadAdRequest(requestId, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [requestId, source, attempt]);
  if (failed) return <section className="admin-home__panel"><p role="alert">{ar ? 'تعذر تحميل طلب الإعلان. راجع الطلب وصلاحية حسابك، ثم أعد المحاولة.' : 'The ad request could not load. Check the request and your permissions, then retry.'}</p><Button onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></section>;
  if (!data) return <p role="status">{ar ? 'جارٍ تحميل طلب الإعلان…' : 'Loading ad request…'}</p>;
  if (!data.request.placementKey || !data.request.intervalStart || !data.request.intervalEnd) return <p role="alert">{ar ? 'حدد موضع الإعلان وفترة العرض من تفاصيل الطلب أولًا.' : 'Set the placement and display window in the request first.'}<a href={`/admin/ads/requests?requestId=${requestId}&lang=${locale}`}>{ar ? 'تفاصيل الطلب' : 'Request details'}</a></p>;
  return <>
    <section className="admin-home__panel admin-home__request-context" aria-label={ar ? 'طلب الإعلان المرتبط' : 'Linked ad request'}>
      <h2>{ar ? 'طلب الإعلان المرتبط' : 'Linked ad request'}</h2>
      <p><a href={`/admin/ads/requests?requestId=${requestId}&lang=${locale}`}>{requestId}</a></p>
      <AdRequestSummary data={data} locale={locale} />
      <p>{ar ? 'هذا النموذج لإعداد بانر في موضع الطلب، وليس لتفعيل علامة «مميز» على العقار. إذا كان المكان أو الغرض غير صحيح، ارجع إلى تفاصيل الطلب قبل الحفظ.' : 'This form prepares a banner in the request’s placement; it does not mark a property as Featured. If the placement or brief is incorrect, return to request details before saving.'}</p>
      <a href={`/admin/providers/${data.request.providerId}?lang=${locale}`}>{ar ? 'حساب صاحب الإعلان' : 'Advertiser account'}</a>
      {data.request.contactPhone ? <p><a dir="ltr" href={`tel:${data.request.contactPhone}`}>{data.request.contactPhone}</a></p> : null}
      <p>{ar ? 'موضع العرض والتواريخ مأخوذة من الطلب. ارفع صورة الإعلان واكتب عنوانه ورابط صفحة العقار أو الشركة المطورة. النشر يحتاج جدولة الطلب بعد اعتماد الدفع أو قرار الإعفاء.' : 'Placement and dates come from this request. Add the ad image, title and property or developer page URL. Publishing requires scheduling the request after payment approval or a waiver.'}</p>
    </section>
    {render(data)}
  </>;
}

export function BannerDestinationHint({ requestId, locale }: { readonly requestId: string; readonly locale: SupportedLocale }) {
  return <p className="admin-home__hint">{locale === 'ar' ? 'الإعلان مرتبط بطلب العميل. ضع رابط صفحة العقار أو الشركة المطورة في «رابط الوجهة»؛ زر «عرض الإعلان» سيفتحها للزائر. لتغيير الفترة، عدّل الطلب قبل إعداد الإعلان.' : 'This banner belongs to the customer request. Set the property or developer page as the destination URL; visitors can open it with “View advertisement”. Change the window in the request before preparing the banner.'} <a href={`/admin/ads/requests?requestId=${requestId}&lang=${locale}`}>{locale === 'ar' ? 'فتح الطلب' : 'Open request'}</a></p>;
}
