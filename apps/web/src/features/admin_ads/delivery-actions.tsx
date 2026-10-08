import { useEffect, useState } from 'react';
import type { AdAdminRequest, AdRequest, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminAdsRequestDetailLoader } from './data.ts';
import type { AdminHomeSource } from '../admin_home/data.ts';
import { Button } from '../design_system/index.ts';
import { AdRequestSummary, adPlacementLabel } from './request-summary.tsx';
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
  return <section className="admin-ads__review-card admin-ads__delivery" aria-label={ar ? 'الإعلان المطلوب وصوره' : 'Requested advertisement and images'}>
    <h3>{ar ? 'الإعلان المطلوب وصوره' : 'Requested advertisement and images'}</h3>
    <p>{ar ? 'البانر مساحة إعلانية بصورة ورابط في المكان المتفق عليه. العقار المميز هو عقار عليه علامة «مميز» داخل قائمة العقارات؛ إعداد بانر أو اعتماد الدفع لا يضع هذه العلامة تلقائيًا.' : 'A banner is an image and link displayed in an agreed placement. A featured property carries a Featured badge in property listings; preparing a banner or approving payment does not add that badge automatically.'}</p>
    {data ? <AdRequestSummary data={data} locale={locale} /> : failed ? <div role="alert"><p>{ar ? 'تعذر تحميل وصف الطلب ومكان عرضه. افتح تفاصيل الطلب أو أعد المحاولة قبل إعداد الإعلان.' : 'Could not load the advertising brief and placement. Open request details or retry before preparing the advertisement.'}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div> : <p role="status">{ar ? 'جارٍ تحميل تفاصيل الإعلان…' : 'Loading advertisement details…'}</p>}
    <div className="admin-ads__delivery-links">
      <a className="ui-button ui-button--primary" href={`/admin/ads/requests?requestId=${requestId}&lang=${locale}`}>{ar ? 'تفاصيل الطلب وجدولة العرض' : 'Request details and scheduling'}</a>
      {canPrepare && data ? <a className="ui-button ui-button--secondary" href={`/admin/banners/new?requestId=${requestId}&lang=${locale}`}>{ar ? `إعداد بانر: ${adPlacementLabel(data, locale)}` : `Prepare banner: ${adPlacementLabel(data, locale)}`}</a> : null}
      <a className="ui-button ui-button--secondary" href={`/admin/banners?adRequestId=${requestId}&lang=${locale}`}>{ar ? 'صور وبانرات هذا الطلب' : 'Images and banners for this request'}</a>
      <a className="ui-button ui-button--secondary" href={`/admin/providers/${providerId}?lang=${locale}`}>{ar ? 'حساب مقدم العقار' : 'Provider account'}</a>
    </div>
    {data && !canPrepare ? <p>{ar ? 'لإعداد بانر جديد، راجع حالة الطلب وحدد مكان العرض وفترة سارية في تفاصيله أولًا.' : 'Before preparing a new banner, check the request status and assign its placement and current display window in request details.'}</p> : null}
    <p>{ar ? 'راجع وصف العميل ثم أكد معه العقار أو المشروع والصور المطلوبة. إذا لم يكتب اسمًا أو رابطًا واضحًا، فالطلب لا يحدد عقارًا بعينه. رابط الوجهة والصور يظهران أدناه بعد إعداد البانر.' : 'Read the customer’s brief and confirm the property or project and requested images. Without a clear name or URL, the request does not identify a specific property. The destination and images appear below once a banner is prepared.'}</p>
    <RequestCreatives requestId={requestId} locale={locale} source={bannerSource} />
    <p className="admin-ads__muted">{ar ? 'إثبات الدفع إيصال خاص بمراجعة الدفع، وليس صورة إعلان. العميل يرسل وصف الطلب والإيصال؛ اتفق معه على الصور ثم ارفعها من إعداد البانر. الحفظ مسودة، وبعد الجدولة واعتماد الدفع أو الإعفاء اختر نشر / جدولة من البانرات.' : 'Payment proof is a private receipt, not an advertising image. The customer submits a brief and receipt; agree the images with them and upload them in banner preparation. Saving creates a draft. After scheduling and payment approval or a waiver, choose Publish / Schedule from banners.'}</p>
  </section>;
}
