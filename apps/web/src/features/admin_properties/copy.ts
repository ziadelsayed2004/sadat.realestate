import type { PropertyAvailableAction, PropertyReportAction, PropertyReportReason, PropertyReportStatus, PropertyStatus, PropertyVisibilityAction, SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminPropertiesView = 'list' | 'review' | 'duplicates' | 'reports';
export type AdminPropertiesState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminPropertiesCopy {
  readonly eyebrow: string;
  readonly titles: Readonly<Record<AdminPropertiesView, string>>;
  readonly descriptions: Readonly<Record<AdminPropertiesView, string>>;
  readonly allProperties: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly activeLabel: string;
  readonly providerLabel: string;
  readonly projectLabel: string;
  readonly allStatuses: string;
  readonly allActivity: string;
  readonly active: string;
  readonly inactive: string;
  readonly apply: string;
  readonly clear: string;
  readonly retry: string;
  readonly review: string;
  readonly details: string;
  readonly duplicates: string;
  readonly reports: string;
  readonly back: string;
  readonly openDuplicates: string;
  readonly openReports: string;
  readonly openProperty: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly count: (count: number) => string;
  readonly candidateCount: (count: number) => string;
  readonly columns: {
    readonly id: string;
    readonly name: string;
    readonly source: string;
    readonly kind: string;
    readonly transaction: string;
    readonly status: string;
    readonly active: string;
    readonly version: string;
    readonly updated: string;
    readonly reason: string;
    readonly actions: string;
    readonly reportId: string;
    readonly propertyId: string;
    readonly reportReason: string;
    readonly priority: string;
    readonly date: string;
  };
  readonly status: Readonly<Record<PropertyStatus, string>>;
  readonly availableAction: Readonly<Record<PropertyAvailableAction, string>>;
  readonly visibilityAction: Readonly<Record<PropertyVisibilityAction, string>>;
  readonly reportStatus: Readonly<Record<PropertyReportStatus, string>>;
  readonly reportAction: Readonly<Record<PropertyReportAction, string>>;
  readonly reportReason: Readonly<Record<PropertyReportReason, string>>;
  readonly signal: Readonly<Record<'same_slug' | 'same_location_transaction' | 'same_localized_name', string>>;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly saveAction: string;
  readonly saving: string;
  readonly actionSaved: string;
  readonly noActions: string;
  readonly noCandidates: string;
  readonly noReports: string;
  readonly detailsLabel: string;
  readonly states: Readonly<Record<AdminPropertiesState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminPropertiesCopy>> = {
  ar: {
    eyebrow: 'إدارة العقارات',
    titles: { list: 'إدارة العقارات', review: 'مراجعة العقار', duplicates: 'عقارات محتملة التكرار', reports: 'بلاغات العقارات' },
    descriptions: {
      list: 'راجع العقارات الجديدة والتعديلات قبل اعتماد النشر.',
      review: 'اعرض الإسقاط الآمن للعقار واتخذ إجراءً مسموحًا من الخادم.',
      duplicates: 'افحص إشارات التكرار المفسرة قبل اتخاذ قرار المراجعة.',
      reports: 'راجع بلاغات العقارات وحدث حالتها بسبب واضح.'
    },
    allProperties: 'جميع العقارات', searchLabel: 'البحث في العقارات', searchPlaceholder: 'ابحث بالاسم أو المعرّف المختصر', statusLabel: 'الحالة', activeLabel: 'النشاط', providerLabel: 'معرّف مقدم العقار', projectLabel: 'معرّف المشروع', allStatuses: 'كل الحالات', allActivity: 'كل حالات النشاط', active: 'نشط', inactive: 'غير نشط', apply: 'تطبيق', clear: 'مسح', retry: 'إعادة المحاولة', review: 'بدء المراجعة', details: 'عرض التفاصيل', duplicates: 'التكرار المحتمل', reports: 'البلاغات', back: 'العودة إلى العقارات', openDuplicates: 'فحص التكرار', openReports: 'فتح البلاغات', openProperty: 'فتح العقار', previous: 'السابق', next: 'التالي', page: (page, total) => `الصفحة ${page} من ${total}`, count: count => `${count.toLocaleString('ar-EG')} عقار`, candidateCount: count => `${count.toLocaleString('ar-EG')} نتائج محتملة`,
    columns: { id: 'رقم العقار', name: 'العقار', source: 'مصدر العقار', kind: 'النوع', transaction: 'نوع المعاملة', status: 'الحالة', active: 'النشاط', version: 'الإصدار', updated: 'آخر تحديث', reason: 'سبب الإجراء', actions: 'الإجراءات', reportId: 'رقم البلاغ', propertyId: 'رقم العقار', reportReason: 'سبب البلاغ', priority: 'الأولوية', date: 'التاريخ' },
    status: { draft: 'مسودة', pending_review: 'قيد المراجعة', needs_changes: 'يحتاج تعديلًا', approved: 'معتمد', published: 'منشور', rejected: 'مرفوض', hidden: 'مخفي', archived: 'مؤرشف' },
    availableAction: { update: 'تعديل', submit: 'إرسال للمراجعة', needs_changes: 'طلب تعديل', approve: 'اعتماد', reject: 'رفض', publish: 'نشر', hide: 'إخفاء', restore: 'استعادة', archive: 'أرشفة' },
    visibilityAction: { hide: 'إخفاء العقار', restore: 'استعادة الظهور', archive: 'أرشفة العقار' },
    reportStatus: { open: 'جديد', in_review: 'قيد المراجعة', resolved: 'تم الحل', dismissed: 'مرفوض' }, reportAction: { resolve: 'حل البلاغ', dismiss: 'رفض البلاغ' }, reportReason: { duplicate: 'تكرار', fraud: 'احتيال', inaccurate: 'بيانات غير دقيقة', inappropriate: 'محتوى غير مناسب', other: 'أخرى' }, signal: { same_slug: 'معرّف مختصر متطابق', same_location_transaction: 'موقع ومعاملة متطابقان', same_localized_name: 'اسم مترجم متطابق' },
    reasonLabel: 'سبب الإجراء', reasonPlaceholder: 'اكتب سببًا واضحًا لا يقل عن خمسة أحرف', reasonRequired: 'سبب الإجراء مطلوب.', saveAction: 'حفظ الإجراء', saving: 'جارٍ الحفظ', actionSaved: 'تم حفظ الإجراء.', noActions: 'لا توجد إجراءات متاحة', noCandidates: 'لا توجد نتائج تكرار محتملة', noReports: 'لا توجد بلاغات مطابقة', detailsLabel: 'تفاصيل البلاغ', states: { loading: { title: 'جارٍ التحميل', body: 'يتم جلب البيانات من المصدر المعتمد.' }, empty: { title: 'لا توجد بيانات', body: 'لا توجد سجلات مطابقة للمرشحات الحالية.' }, error: { title: 'تعذر تحميل البيانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتًا', body: 'يمكن إعادة المحاولة دون تغيير البيانات الحالية.' }, permission: { title: 'الوصول غير متاح', body: 'تحتاج هذه الصفحة إلى جلسة مدير موثقة والصلاحية المناسبة.' }, not_found: { title: 'السجل غير موجود', body: 'تعذر العثور على السجل المطلوب ضمن الإسقاط المتاح.' }, success: { title: 'البيانات جاهزة', body: 'تُعرض السجلات من الإسقاط المعتمد من الخادم.' } }, directionNote: 'العربية RTL — إدارة العقارات معتمدة لسطح المكتب.'
  },
  en: {
    eyebrow: 'Property administration',
    titles: { list: 'Properties management', review: 'Property review', duplicates: 'Possible duplicate properties', reports: 'Property reports' },
    descriptions: { list: 'Review new properties and changes before approval and publication.', review: 'Inspect the safe property projection and take a server-permitted action.', duplicates: 'Inspect explainable duplicate signals before making a review decision.', reports: 'Review property reports and update their state with a clear reason.' },
    allProperties: 'All properties', searchLabel: 'Search properties', searchPlaceholder: 'Search by name or slug', statusLabel: 'Status', activeLabel: 'Activity', providerLabel: 'Provider ID', projectLabel: 'Project ID', allStatuses: 'All statuses', allActivity: 'All activity', active: 'Active', inactive: 'Inactive', apply: 'Apply', clear: 'Clear', retry: 'Retry', review: 'Start review', details: 'View details', duplicates: 'Possible duplicates', reports: 'Reports', back: 'Back to properties', openDuplicates: 'Check duplicates', openReports: 'Open reports', openProperty: 'Open property', previous: 'Previous', next: 'Next', page: (page, total) => `Page ${page} of ${total}`, count: count => `${count.toLocaleString('en-US')} properties`, candidateCount: count => `${count.toLocaleString('en-US')} possible matches`,
    columns: { id: 'Property ID', name: 'Property', source: 'Property source', kind: 'Kind', transaction: 'Transaction', status: 'Status', active: 'Activity', version: 'Version', updated: 'Updated', reason: 'Action reason', actions: 'Actions', reportId: 'Report ID', propertyId: 'Property ID', reportReason: 'Report reason', priority: 'Priority', date: 'Date' },
    status: { draft: 'Draft', pending_review: 'Under review', needs_changes: 'Needs changes', approved: 'Approved', published: 'Published', rejected: 'Rejected', hidden: 'Hidden', archived: 'Archived' },
    availableAction: { update: 'Update', submit: 'Submit for review', needs_changes: 'Request changes', approve: 'Approve', reject: 'Reject', publish: 'Publish', hide: 'Hide', restore: 'Restore', archive: 'Archive' },
    visibilityAction: { hide: 'Hide property', restore: 'Restore visibility', archive: 'Archive property' },
    reportStatus: { open: 'New', in_review: 'In review', resolved: 'Resolved', dismissed: 'Dismissed' }, reportAction: { resolve: 'Resolve report', dismiss: 'Dismiss report' }, reportReason: { duplicate: 'Duplicate', fraud: 'Fraud', inaccurate: 'Inaccurate data', inappropriate: 'Inappropriate', other: 'Other' }, signal: { same_slug: 'Matching slug', same_location_transaction: 'Matching location and transaction', same_localized_name: 'Matching localized name' },
    reasonLabel: 'Action reason', reasonPlaceholder: 'Write a clear reason of at least five characters', reasonRequired: 'An action reason is required.', saveAction: 'Save action', saving: 'Saving', actionSaved: 'Action saved.', noActions: 'No actions available', noCandidates: 'No possible duplicate matches', noReports: 'No matching reports', detailsLabel: 'Report details', states: { loading: { title: 'Loading', body: 'Fetching records from the approved source.' }, empty: { title: 'No records found', body: 'No records match the current filters.' }, error: { title: 'Records could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching permission.' }, not_found: { title: 'Record not found', body: 'The requested record is not present in the available projection.' }, success: { title: 'Records ready', body: 'Records are rendered from the server-approved projection.' } }, directionNote: 'English LTR — property administration is approved for desktop.'
  },};

export function getAdminPropertiesCopy(locale: SupportedLocale): AdminPropertiesCopy {
  return copyByLocale[locale];
}
