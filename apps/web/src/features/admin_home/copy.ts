import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminHomeState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminHomeCopy {
  readonly eyebrow: string;
  readonly banners: string;
  readonly newBanner: string;
  readonly tips: string;
  readonly homepage: string;
  readonly bannerDescription: string;
  readonly tipsDescription: string;
  readonly homepageDescription: string;
  readonly add: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  readonly retry: string;
  readonly preview: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly key: string;
  readonly placement: string;
  readonly title: string;
  readonly altText: string;
  readonly targetUrl: string;
  readonly start: string;
  readonly end: string;
  readonly order: string;
  readonly status: string;
  readonly visible: string;
  readonly active: string;
  readonly version: string;
  readonly updated: string;
  readonly actions: string;
  readonly body: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly localizedHint: string;
  readonly mediaUrl: string;
  readonly mediaMime: string;
  readonly mediaWidth: string;
  readonly mediaHeight: string;
  readonly mediaNote: string;
  readonly saved: string;
  readonly validation: string;
  readonly statuses: Readonly<Record<string, string>>;
  readonly actionsByKey: Readonly<Record<string, string>>;
  readonly states: Readonly<Record<AdminHomeState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminHomeCopy>> = {
  ar: {
    eyebrow: 'إدارة الصفحة الرئيسية', banners: 'البانرات', newBanner: 'إضافة بانر', tips: 'النصائح', homepage: 'أقسام الصفحة الرئيسية',
    bannerDescription: 'أدر البانرات من الإسقاط الإداري المعتمد مع ترتيبها وحالتها.', tipsDescription: 'أدر النصائح العقارية المنشورة أو المسودة من مصدر المحتوى المعتمد.', homepageDescription: 'رتب أقسام الصفحة الرئيسية وحدد ظهورها وحالتها.', add: 'إضافة', save: 'حفظ', saving: 'جارٍ الحفظ', cancel: 'إلغاء', retry: 'إعادة المحاولة', preview: 'معاينة', moveUp: 'تحريك لأعلى', moveDown: 'تحريك لأسفل',
    key: 'المفتاح', placement: 'الموضع', title: 'العنوان', altText: 'النص البديل', targetUrl: 'الرابط المستهدف', start: 'البداية', end: 'النهاية', order: 'الترتيب', status: 'الحالة', visible: 'ظاهر', active: 'نشط', version: 'الإصدار', updated: 'آخر تحديث', actions: 'الإجراءات', body: 'المحتوى', reason: 'سبب التغيير', reasonPlaceholder: 'اكتب سببًا واضحًا لا يقل عن ثلاثة أحرف', reasonRequired: 'سبب التغيير مطلوب.', localizedHint: 'أدخل النص بالعربية والإنجليزية والصينية عند الحاجة.', mediaUrl: 'رابط الوسائط HTTPS', mediaMime: 'نوع الوسائط', mediaWidth: 'العرض', mediaHeight: 'الارتفاع', mediaNote: 'يقبل النظام رابط HTTPS المعتمد فقط؛ لا تعرض مفاتيح التخزين أو روابط خاصة دائمة.', saved: 'تم الحفظ.', validation: 'تحقق من الحقول المطلوبة.',
    statuses: { draft: 'مسودة', scheduled: 'مجدول', active: 'نشط', ended: 'منتهٍ', archived: 'مؤرشف', published: 'منشور', inactive: 'غير نشط' }, actionsByKey: { update: 'تعديل', publish: 'نشر', deactivate: 'تعطيل' },
    states: { loading: { title: 'جارٍ تحميل البيانات', body: 'يتم جلب السجلات من المصدر المعتمد.' }, empty: { title: 'لا توجد سجلات', body: 'لا توجد سجلات متاحة في الإسقاط الحالي.' }, error: { title: 'تعذر تحميل البيانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتًا', body: 'يمكن إعادة المحاولة دون تغيير البيانات الحالية.' }, permission: { title: 'الوصول غير مسموح', body: 'تتطلب هذه الصفحة جلسة مدير مصادقًا عليها والصلاحية المناسبة.' }, not_found: { title: 'المسار غير موجود', body: 'لا يوجد مسار إدارة مطابق.' }, success: { title: 'البيانات جاهزة', body: 'تُعرض السجلات من الإسقاط الآمن المعتمد.' } }, directionNote: 'العربية RTL — إدارة الصفحة الرئيسية معتمدة لسطح المكتب.'
  },
  en: {
    eyebrow: 'Homepage administration', banners: 'Banners', newBanner: 'Add banner', tips: 'Tips', homepage: 'Homepage sections',
    bannerDescription: 'Manage banners from the approved administrative projection, including order and status.', tipsDescription: 'Manage approved real-estate tips from the CMS projection.', homepageDescription: 'Order homepage sections and control visibility and publication state.', add: 'Add', save: 'Save', saving: 'Saving', cancel: 'Cancel', retry: 'Retry', preview: 'Preview', moveUp: 'Move up', moveDown: 'Move down',
    key: 'Key', placement: 'Placement', title: 'Title', altText: 'Alt text', targetUrl: 'Target URL', start: 'Start', end: 'End', order: 'Order', status: 'Status', visible: 'Visible', active: 'Active', version: 'Version', updated: 'Updated', actions: 'Actions', body: 'Body', reason: 'Change reason', reasonPlaceholder: 'Write a clear reason of at least three characters', reasonRequired: 'A change reason is required.', localizedHint: 'Provide Arabic and English values as applicable.', mediaUrl: 'HTTPS media URL', mediaMime: 'Media MIME', mediaWidth: 'Width', mediaHeight: 'Height', mediaNote: 'Only approved HTTPS media URLs are accepted; storage keys and permanent private links are never displayed.', saved: 'Saved.', validation: 'Check the required fields.',
    statuses: { draft: 'Draft', scheduled: 'Scheduled', active: 'Active', ended: 'Ended', archived: 'Archived', published: 'Published', inactive: 'Inactive' }, actionsByKey: { update: 'Edit', publish: 'Publish', deactivate: 'Deactivate' },
    states: { loading: { title: 'Loading data', body: 'Fetching records from the approved source.' }, empty: { title: 'No records found', body: 'There are no records in the current projection.' }, error: { title: 'Data could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching permission.' }, not_found: { title: 'Route not found', body: 'No matching administration route exists.' }, success: { title: 'Data ready', body: 'Records are rendered from the approved safe projection.' } }, directionNote: 'English LTR — homepage administration is approved for desktop.'
  },};

export function getAdminHomeCopy(locale: SupportedLocale): AdminHomeCopy {
  return copyByLocale[locale];
}
