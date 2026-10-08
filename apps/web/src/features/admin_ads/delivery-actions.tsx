import type { AdRequest, SupportedLocale } from '@sadat-real-estate/contracts';

export function AdDeliveryActions({ requestId, providerId, locale }: { readonly requestId: AdRequest['id']; readonly providerId: AdRequest['providerId']; readonly locale: SupportedLocale }) {
  const ar = locale === 'ar';
  return <section className="admin-ads__review-card admin-ads__delivery" aria-label={ar ? 'إعداد إعلان العميل' : 'Prepare customer advertisement'}>
    <h3>{ar ? 'إعداد إعلان العميل' : 'Prepare customer advertisement'}</h3>
    <p>{ar ? 'بعد اعتماد الدفع، افتح تفاصيل الطلب وحدد فترة العرض. ثم جهّز الإعلان: ارفع صورة الإعلان، اكتب عنوانه، وحدد رابط صفحة العقار أو الشركة المطورة. احفظه واضغط «نشر البانر» ليظهر خلال الفترة المحددة.' : 'After approving payment, open the request and schedule its display window. Prepare the advertisement with its image, title and property or developer page URL, save it, then publish the banner for that window.'}</p>
    <div className="admin-ads__delivery-links">
      <a className="ui-button ui-button--primary" href={`/admin/ads/requests?requestId=${requestId}&lang=${locale}`}>{ar ? 'تفاصيل الطلب وجدولة العرض' : 'Request details and scheduling'}</a>
      <a className="ui-button ui-button--secondary" href={`/admin/banners/new?requestId=${requestId}&lang=${locale}`}>{ar ? 'إعداد صورة الإعلان ورابط العقار' : 'Prepare ad image and destination'}</a>
      <a className="ui-button ui-button--secondary" href={`/admin/banners?adRequestId=${requestId}&lang=${locale}`}>{ar ? 'عرض إعلانات هذا الطلب' : 'View this request’s advertisements'}</a>
      <a className="ui-button ui-button--secondary" href={`/admin/providers/${providerId}?lang=${locale}`}>{ar ? 'حساب مقدم العقار' : 'Provider account'}</a>
    </div>
    <p className="admin-ads__muted">{ar ? 'إثبات الدفع هو إيصال الدفع؛ صورة الإعلان تُرفع بشكل منفصل.' : 'The payment receipt and the advertising image are separate files.'}</p>
  </section>;
}
