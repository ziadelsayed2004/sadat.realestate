import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function adTypeLabel(type: string, locale: SupportedLocale): string {
  if (type === 'featured_card') return locale === 'ar' ? 'إعلان مميز (كارت)' : 'Featured ad card';
  if (type === 'banner') return locale === 'ar' ? 'إعلان بصورة (بانر)' : 'Image banner';
  return type;
}

export function adTypeHelp(type: string, locale: SupportedLocale): string {
  if (type === 'featured_card') return locale === 'ar' ? 'كارت إعلان بصورة ونص. مكان ظهوره يتحدد من «مكان عرض الإعلان».' : 'An advertising card with an image and text. Its location is set by the advertising placement.';
  if (type === 'banner') return locale === 'ar' ? 'صورة إعلانية تظهر في مكان العرض الذي تختاره.' : 'An advertising image displayed in your selected placement.';
  return locale === 'ar' ? 'اختر شكل الإعلان المتفق عليه مع العميل، ثم حدد مكان عرضه والفترة.' : 'Choose the format agreed with the customer, then set its placement and dates.';
}
