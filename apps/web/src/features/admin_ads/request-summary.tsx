import type { AdAdminRequest, SupportedLocale } from '@sadat-real-estate/contracts';

export function adPlacementLabel(data: AdAdminRequest, locale: SupportedLocale): string {
  const key = data.request.placementKey;
  const label = data.pricingOptions?.placements.find(item => item.key === key)?.label;
  if (label) return label[locale] || label.ar || label.en || key || '';
  if (key === 'homepage.hero') return locale === 'ar' ? 'بانر أعلى الصفحة الرئيسية' : 'Homepage hero banner';
  if (key === 'homepage.featured') return locale === 'ar' ? 'كارت مميز في الرئيسية' : 'Featured homepage card';
  return key || (locale === 'ar' ? 'لم يحدد مكان العرض بعد' : 'Display placement not assigned yet');
}

export function AdRequestSummary({ data, locale }: { data: AdAdminRequest; locale: SupportedLocale }) {
  const ar = locale === 'ar';
  return <dl className="admin-ads__campaign-summary" data-testid="ad-request-summary">
    <div><dt>{ar ? 'وصف العميل للإعلان' : 'Customer’s advertising brief'}</dt><dd>{data.request.purpose}</dd></div>
    <div><dt>{ar ? 'مكان ظهور الإعلان' : 'Where the advertisement appears'}</dt><dd>{adPlacementLabel(data, locale)}</dd></div>
    {data.request.adType ? <div><dt>{ar ? 'نوع الإعلان' : 'Ad type'}</dt><dd>{data.request.adType === 'featured_card' ? ar ? 'كارت مميز' : 'Featured card' : data.request.adType}</dd></div> : null}
    {data.request.contactPhone ? <div><dt>{ar ? 'تواصل مع صاحب الطلب لتأكيد العقار والصور' : 'Contact the requester to confirm the property and images'}</dt><dd><a dir="ltr" href={`tel:${data.request.contactPhone}`}>{data.request.contactPhone}</a></dd></div> : null}
  </dl>;
}
