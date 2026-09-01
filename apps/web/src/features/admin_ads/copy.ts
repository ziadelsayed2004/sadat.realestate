import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminAdsState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminAdsCopy {
  readonly eyebrow: string;
  readonly tabs: {
    readonly requests: string;
    readonly pendingProofs: string;
    readonly approvedProofs: string;
    readonly calendar: string;
    readonly review: string;
    readonly financial: string;
  };
  readonly titles: {
    readonly requests: string;
    readonly pendingProofs: string;
    readonly approvedProofs: string;
    readonly calendar: string;
    readonly review: string;
    readonly financial: string;
  };
  readonly descriptions: {
    readonly requests: string;
    readonly pendingProofs: string;
    readonly approvedProofs: string;
    readonly calendar: string;
    readonly review: string;
    readonly financial: string;
  };
  readonly searchLabel: string;
  readonly providerPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly count: (count: number) => string;
  readonly rowsOnPage: string;
  readonly columns: {
    readonly id: string;
    readonly request: string;
    readonly provider: string;
    readonly placement: string;
    readonly purpose: string;
    readonly status: string;
    readonly quote: string;
    readonly interval: string;
    readonly filename: string;
    readonly size: string;
    readonly security: string;
    readonly version: string;
    readonly uploaded: string;
    readonly start: string;
    readonly end: string;
    readonly timezone: string;
    readonly state: string;
    readonly occurred: string;
    readonly amount: string;
    readonly source: string;
    readonly actions: string;
  };
  readonly requestStatus: Readonly<Record<string, string>>;
  readonly proofStatus: Readonly<Record<string, string>>;
  readonly calendarStatus: Readonly<Record<string, string>>;
  readonly financialState: Readonly<Record<string, string>>;
  readonly ledgerKind: Readonly<Record<string, string>>;
  readonly view: string;
  readonly reviewAction: string;
  readonly approve: string;
  readonly reject: string;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly reviewSaved: string;
  readonly reviewing: string;
  readonly detail: string;
  readonly back: string;
  readonly notRealized: string;
  readonly noMetrics: string;
  readonly unavailable: string;
  readonly directionNote: string;
  readonly states: Readonly<Record<AdminAdsState, { readonly title: string; readonly body: string }>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminAdsCopy>> = {
  ar: {
    eyebrow: 'إدارة الإعلانات والمدفوعات',
    tabs: { requests: 'طلبات الإعلانات', pendingProofs: 'إثباتات قيد المراجعة', approvedProofs: 'إثباتات معتمدة', calendar: 'تقويم الإعلانات', review: 'مراجعة المدفوعات', financial: 'المراجعة المالية' },
    titles: { requests: 'طلبات الإعلانات', pendingProofs: 'إثباتات الدفع المعلقة', approvedProofs: 'إثباتات الدفع المعتمدة', calendar: 'تقويم الإعلانات', review: 'مراجعة المدفوعات', financial: 'المراجعة المالية التشغيلية' },
    descriptions: { requests: 'راجع الطلبات والاقتباسات اليدوية من الإسقاط الإداري المعتمد.', pendingProofs: 'اعرض إثباتات الدفع التي تنتظر المراجعة اليدوية.', approvedProofs: 'اعرض الإثباتات التي تمت الموافقة عليها يدوياً.', calendar: 'اعرض المواعيد المنشورة في المنطقة الزمنية للقاهرة.', review: 'اتخذ قراراً يسبباً على إثبات قيد المراجعة مع سبب وإصدار متوقع.', financial: 'بيانات تشغيلية للإعلانات وليست نظاماً محاسبياً أو إثباتاً مصرفياً.' },
    searchLabel: 'معرّف مقدم الخدمة',
    providerPlaceholder: 'أدخل معرّف مقدم الخدمة',
    statusLabel: 'الحالة',
    allStatuses: 'كل الحالات',
    apply: 'تطبيق',
    clear: 'مسح',
    previous: 'السابق',
    next: 'التالي',
    page: (page, total) => `الصفحة ${page} من ${total}`,
    count: count => `${count.toLocaleString('ar-EG')} سجل`,
    rowsOnPage: 'سجلات الصفحة',
    columns: { id: 'المعرّف', request: 'طلب الإعلان', provider: 'مقدم الخدمة', placement: 'الموضع', purpose: 'الغرض', status: 'الحالة', quote: 'الاقتباس', interval: 'الفترة', filename: 'اسم الملف', size: 'الحجم', security: 'الفحص', version: 'الإصدار', uploaded: 'تاريخ الرفع', start: 'البداية', end: 'النهاية', timezone: 'المنطقة الزمنية', state: 'الحالة المالية', occurred: 'حدث في', amount: 'المبلغ', source: 'المصدر', actions: 'الإجراءات' },
    requestStatus: { draft: 'مسودة', review: 'قيد المراجعة', waiting_pricing: 'بانتظار التسعير', quote_sent: 'تم إرسال الاقتباس', waiting_payment: 'بانتظار الدفع', scheduled: 'مجدول', active: 'نشط', ended: 'منتهٍ', rejected: 'مرفوض', cancelled: 'ملغى', expired: 'منتهي' },
    proofStatus: { uploaded: 'تم الرفع', pending_review: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' },
    calendarStatus: { scheduled: 'مجدول', active: 'نشط', ended: 'منتهٍ' },
    financialState: { not_submitted: 'لم يُرسل', quote_only: 'اقتباس فقط', payment_proof_pending_review: 'إثبات قيد المراجعة', payment_proof_approved: 'إثبات معتمد', payment_proof_rejected: 'إثبات مرفوض' },
    ledgerKind: { quote_issued: 'إصدار اقتباس', quote_accepted: 'قبول اقتباس', quote_rejected: 'رفض اقتباس', quote_cancelled: 'إلغاء اقتباس', payment_proof_uploaded: 'رفع إثبات', payment_proof_approved: 'اعتماد إثبات', payment_proof_rejected: 'رفض إثبات', scheduled: 'جدولة', active: 'تفعيل', ended: 'إنهاء' },
    view: 'عرض',
    reviewAction: 'إجراء المراجعة',
    approve: 'اعتماد',
    reject: 'رفض',
    reasonLabel: 'سبب الإجراء',
    reasonPlaceholder: 'اكتب سبباً واضحاً لا يقل عن حرفين',
    reasonRequired: 'سبب الإجراء مطلوب.',
    reviewSaved: 'تم حفظ الإجراء.',
    reviewing: 'جارٍ الحفظ',
    detail: 'تفاصيل الطلب',
    back: 'العودة إلى الطلبات',
    notRealized: 'بيانات تشغيلية فقط؛ لا تمثل إيراداً محققاً أو تحققاً بنكياً.',
    noMetrics: 'لا توجد مؤشرات إضافية في العقد الحالي.',
    unavailable: 'غير متاح',
    directionNote: 'العربية RTL — لوحة الإدارة معتمدة لسطح المكتب.',
    states: { loading: { title: 'جارٍ التحميل', body: 'يتم جلب البيانات من المصدر المعتمد.' }, empty: { title: 'لا توجد سجلات', body: 'لا توجد بيانات مطابقة للمرشحات الحالية.' }, error: { title: 'تعذر تحميل البيانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتاً', body: 'يمكنك إعادة المحاولة دون تغيير البيانات الحالية.' }, permission: { title: 'الوصول غير مسموح', body: 'تحتاج هذه الصفحة إلى جلسة مدير مصادق عليها والصلاحية المناسبة.' }, not_found: { title: 'السجل غير موجود', body: 'تعذر العثور على السجل المطلوب ضمن الإسقاط المتاح.' }, success: { title: 'البيانات جاهزة', body: 'تُعرض السجلات من إسقاط الخادم المعتمد.' } }
  },
  en: {
    eyebrow: 'Advertising and payments administration',
    tabs: { requests: 'Ad requests', pendingProofs: 'Pending proofs', approvedProofs: 'Approved proofs', calendar: 'Ad calendar', review: 'Payment review', financial: 'Financial review' },
    titles: { requests: 'Advertising requests', pendingProofs: 'Pending payment proofs', approvedProofs: 'Approved payment proofs', calendar: 'Advertising calendar', review: 'Pending payment review', financial: 'Operational financial review' },
    descriptions: { requests: 'Review requests and manual quotes from the approved administrative projection.', pendingProofs: 'Review active payment proofs waiting for manual review.', approvedProofs: 'Review active payment proofs approved by an administrator.', calendar: 'View scheduled advertising events in the Cairo timezone.', review: 'Approve or reject a pending proof with a reason and expected version.', financial: 'Operational advertising data; this is not an accounting system or bank verification.' },
    searchLabel: 'Provider ID',
    providerPlaceholder: 'Enter a provider ID',
    statusLabel: 'Status',
    allStatuses: 'All statuses',
    apply: 'Apply',
    clear: 'Clear',
    previous: 'Previous',
    next: 'Next',
    page: (page, total) => `Page ${page} of ${total}`,
    count: count => `${count.toLocaleString('en-US')} records`,
    rowsOnPage: 'Rows on page',
    columns: { id: 'ID', request: 'Ad request', provider: 'Provider', placement: 'Placement', purpose: 'Purpose', status: 'Status', quote: 'Quote', interval: 'Interval', filename: 'Filename', size: 'Size', security: 'Security', version: 'Version', uploaded: 'Uploaded', start: 'Start', end: 'End', timezone: 'Timezone', state: 'Financial state', occurred: 'Occurred', amount: 'Amount', source: 'Source', actions: 'Actions' },
    requestStatus: { draft: 'Draft', review: 'Under review', waiting_pricing: 'Waiting for pricing', quote_sent: 'Quote sent', waiting_payment: 'Waiting for payment', scheduled: 'Scheduled', active: 'Active', ended: 'Ended', rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired' },
    proofStatus: { uploaded: 'Uploaded', pending_review: 'Pending review', approved: 'Approved', rejected: 'Rejected' },
    calendarStatus: { scheduled: 'Scheduled', active: 'Active', ended: 'Ended' },
    financialState: { not_submitted: 'Not submitted', quote_only: 'Quote only', payment_proof_pending_review: 'Payment proof pending', payment_proof_approved: 'Payment proof approved', payment_proof_rejected: 'Payment proof rejected' },
    ledgerKind: { quote_issued: 'Quote issued', quote_accepted: 'Quote accepted', quote_rejected: 'Quote rejected', quote_cancelled: 'Quote cancelled', payment_proof_uploaded: 'Proof uploaded', payment_proof_approved: 'Proof approved', payment_proof_rejected: 'Proof rejected', scheduled: 'Scheduled', active: 'Activated', ended: 'Ended' },
    view: 'View',
    reviewAction: 'Review action',
    approve: 'Approve',
    reject: 'Reject',
    reasonLabel: 'Action reason',
    reasonPlaceholder: 'Write a clear reason of at least two characters',
    reasonRequired: 'An action reason is required.',
    reviewSaved: 'Action saved.',
    reviewing: 'Saving',
    detail: 'Request details',
    back: 'Back to requests',
    notRealized: 'Operational data only; it does not represent realized revenue or bank verification.',
    noMetrics: 'No additional metrics are present in the current contract.',
    unavailable: 'Unavailable',
    directionNote: 'English LTR — the admin dashboard is approved for desktop.',
    states: { loading: { title: 'Loading data', body: 'Fetching records from the approved source.' }, empty: { title: 'No records found', body: 'No data matches the current filters.' }, error: { title: 'Data could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching permission.' }, not_found: { title: 'Record not found', body: 'The requested record is not present in the available projection.' }, success: { title: 'Data ready', body: 'Records are rendered from the server-approved projection.' } }
  },};

export function getAdminAdsCopy(locale: SupportedLocale): AdminAdsCopy {
  return copyByLocale[locale];
}
