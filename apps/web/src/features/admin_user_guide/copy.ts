import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { localizeCopy } from '../localization/copy-catalog.ts';

export function getUserGuideCopy(locale: SupportedLocale) {
  return localizeCopy('admin_user_guide/copy#getUserGuideCopy', locale, locale === 'ar' ? {
    title: 'دليل الاستخدام', eyebrow: 'مركز المساعدة',
    description: 'خطوات واضحة، شرح الحقول، إجابات للأسئلة وروابط مباشرة لكل مهمة.',
    language: 'الشرح التفصيلي باللغة العربية • إصدار 6 أكتوبر 2026',
    accountType: 'نوع الحساب', audienceNote: 'اختيار نوع الحساب يغيّر الشرح فقط ولا يغيّر دورك أو صلاحياتك.',
    download: 'تحميل النتائج كملف نصي',
    search: 'ابحث في الدليل', placeholder: 'مثال: نشر بانر، عمولة، مستندات، تعديل الفريق…',
    category: 'القسم', all: 'كل الأقسام', toc: 'الفهرس الداخلي', openAll: 'فتح الكل', closeAll: 'طي الكل',
    maximize: 'تكبير مساحة القراءة', restore: 'استعادة الحجم', minimize: 'تصغير الدليل', expand: 'إظهار الدليل',
    print: 'طباعة النتائج / حفظ PDF', clear: 'مسح البحث والتصفية', empty: 'لا توجد موضوعات مطابقة',
    emptyHelp: 'جرّب اسم الصفحة أو كلمة أقصر، أو اختر كل الأقسام.', count: 'موضوع',
    before: 'قبل أن تبدأ', steps: 'الخطوات', fields: 'شرح الحقول والمعاني', result: 'النتيجة المتوقعة',
    faq: 'أسئلة وحلول', links: 'افتح صفحة المهمة', limitation: 'حدود الوظيفة الحالية',
    share: 'نسخ رابط الموضوع', copied: 'تم نسخ رابط الموضوع.', copyFailed: 'تعذر النسخ. يمكنك نسخ رابط الموضوع من عنوان المتصفح بعد فتحه من الفهرس.',
    tabNote: 'روابط المهام تفتح في تبويب جديد. صفحات الباحث والمقدّم تحتاج حساب الدور المناسب.',
    permission: 'سجّل الدخول لفتح دليل حسابك.', textSize: 'حجم نص الشرح', normal: 'عادي', large: 'كبير',
    minimized: 'الدليل مصغّر. اضغط إظهار الدليل للعودة إلى موضع القراءة.', resume: 'متابعة آخر موضوع', top: 'العودة لأعلى'
  } : {
    title: 'User guide', eyebrow: 'Help centre',
    description: 'Task steps, field explanations, answers and direct links to the working screens.',
    language: 'Detailed reference in Arabic • 6 October 2026 edition',
    accountType: 'Account type', audienceNote: 'This selection filters the instructions; it does not change your account role or permissions.',
    download: 'Download results as text',
    search: 'Search the guide', placeholder: 'Search a topic or route; Arabic explanations are included…',
    category: 'Section', all: 'All sections', toc: 'Contents', openAll: 'Expand all', closeAll: 'Collapse all',
    maximize: 'Maximize reading area', restore: 'Restore size', minimize: 'Minimize guide', expand: 'Show guide',
    print: 'Print results / save PDF', clear: 'Clear search and filters', empty: 'No matching topics',
    emptyHelp: 'Try a shorter term, a screen name or all sections.', count: 'topics',
    before: 'Before you start', steps: 'Steps', fields: 'Fields and meanings', result: 'Expected result',
    faq: 'Questions and solutions', links: 'Open task screen', limitation: 'Current feature limits',
    share: 'Copy topic link', copied: 'Topic link copied.', copyFailed: 'Copy failed. Open the topic from the contents and copy its browser URL.',
    tabNote: 'Task links open a new tab. Seeker and provider screens require an account with that role.',
    permission: 'Sign in to open your account guide.', textSize: 'Explanation text size', normal: 'Normal', large: 'Large',
    minimized: 'The guide is minimized. Select Show guide to resume reading.', resume: 'Resume last topic', top: 'Back to top'
  });
}
