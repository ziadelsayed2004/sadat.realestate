import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function BannerRotationHint({ locale }: { readonly locale: SupportedLocale }) {
  return <p className="admin-home__hint" data-testid="banner-rotation-hint">{locale === 'ar' ? 'بانرات الصفحة الرئيسية تتبدّل تلقائيًا حسب الترتيب. انشر البانرات المطلوبة واجعل فترات عرضها متداخلة؛ المسودات والبانرات المنتهية لا تظهر. من «تعديل» حدد «مدة عرض كل صورة (بالثواني)» لكل بانر، واستخدم الأسهم لتغيير الترتيب. تبديل الصور يتوقف مؤقتًا أثناء التفاعل مع البانر أو نموذج البحث.' : 'Homepage banners rotate automatically in order. Publish the banners with overlapping display periods; drafts and expired banners are excluded. In Edit, set Seconds per image for each banner and use the arrows to change the order. Rotation pauses while interacting with the banner or search form.'}</p>;
}
