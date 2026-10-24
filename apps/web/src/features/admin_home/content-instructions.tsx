import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function ContentInstructions({ locale, tip = false }: { locale: SupportedLocale; tip?: boolean }) {
  return <aside className="admin-home__hint">{tip
    ? locale === 'ar' ? 'رابط صورة النصيحة اختياري: ألصق رابط HTTPS مباشر للصورة لتظهر في المعاينة. ليس رابط صفحة أو زر انتقال. اتركه فارغًا لنصيحة نصية.' : 'The optional tip image URL must point directly to an HTTPS image. It is not a page destination. Leave it empty for text-only advice.'
    : locale === 'ar' ? 'هذه الصفحة تغيّر عناوين أقسام الرئيسية ووصفها. امسح الوصف باللغتين لإخفائه، ثم احفظ وانتظر إغلاق النموذج. الترجمة المتبقية تستخدم عند غياب اللغة الأخرى. المقالات والعقارات والبانرات تُدار من صفحاتها.' : 'This page changes homepage section headings and descriptions. Clear both description languages to hide it, then save and wait for the editor to close. A remaining translation is used when another language is missing. Manage articles, properties and banners in their own pages.'}
    <a href={`/admin/user-guide?lang=${locale}#guide-tips-home`}>{locale === 'ar' ? 'فتح الشرح في دليل الأدمن' : 'Read the admin guide'}</a>
  </aside>;
}
