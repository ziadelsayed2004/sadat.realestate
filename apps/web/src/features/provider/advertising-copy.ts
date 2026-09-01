import type { SupportedLocale } from '@sadat-real-estate/contracts';
import type { ProviderAdvertisingStatus } from './advertising-data.ts';

export type ProviderAdvertisingState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission' | 'notFound';
export type ProviderAdvertisingQuoteStatus = 'issued' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
export type ProviderAdvertisingPaymentStatus = 'uploaded' | 'pending_review' | 'approved' | 'rejected';

export interface ProviderAdvertisingCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly create: string;
  readonly refresh: string;
  readonly filtersLabel: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly count: string;
  readonly columns: Readonly<Record<'request' | 'placement' | 'period' | 'status' | 'quote' | 'payment' | 'actions', string>>;
  readonly statuses: Readonly<Record<ProviderAdvertisingStatus, string>>;
  readonly quoteStatuses: Readonly<Record<ProviderAdvertisingQuoteStatus, string>>;
  readonly paymentStatuses: Readonly<Record<ProviderAdvertisingPaymentStatus, string>>;
  readonly open: string;
  readonly backToList: string;
  readonly requestDetails: string;
  readonly purpose: string;
  readonly interval: string;
  readonly history: string;
  readonly quote: string;
  readonly quoteTotal: string;
  readonly quoteValidUntil: string;
  readonly quoteTerms: string;
  readonly acceptQuote: string;
  readonly paymentProof: string;
  readonly paymentProofHelp: string;
  readonly uploadPaymentProof: string;
  readonly paymentProofUploaded: string;
  readonly noPaymentProof: string;
  readonly schedule: string;
  readonly noSchedule: string;
  readonly noQuote: string;
  readonly noHistory: string;
  readonly createForm: {
    readonly title: string;
    readonly description: string;
    readonly placementKey: string;
    readonly placementKeyHelp: string;
    readonly purpose: string;
    readonly start: string;
    readonly end: string;
    readonly cancel: string;
    readonly save: string;
    readonly validation: string;
    readonly close: string;
  };
  readonly commission: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly appliedPolicy: string;
    readonly source: string;
    readonly effectiveAt: string;
    readonly version: string;
    readonly kind: string;
    readonly percentage: string;
    readonly fixed: string;
    readonly noneTitle: string;
    readonly noneBody: string;
    readonly readOnly: string;
    readonly unavailable: string;
  };
  readonly states: Readonly<Record<ProviderAdvertisingState, { readonly title: string; readonly body: string }>>;
  readonly retry: string;
  readonly notFound: string;
  readonly unavailable: string;
  readonly success: string;
  readonly mutationFailed: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderAdvertisingCopy>> = {
  ar: {
    eyebrow: 'الإعلانات',
    title: 'طلبات الإعلان',
    description: 'تابع طلبات الإعلان والأسعار الإدارية وحالة إثبات الدفع من حسابك.',
    create: 'طلب إعلان جديد',
    refresh: 'تحديث',
    filtersLabel: 'تصفية الطلبات',
    statusLabel: 'الحالة',
    allStatuses: 'كل الحالات',
    apply: 'تطبيق',
    clear: 'مسح',
    count: 'طلب إعلان',
    columns: { request: 'رقم الطلب', placement: 'الموضع والغرض', period: 'الفترة', status: 'الحالة', quote: 'السعر الإداري', payment: 'إثبات الدفع', actions: 'الإجراءات' },
    statuses: { draft: 'مسودة', review: 'قيد المراجعة', waiting_pricing: 'في انتظار التسعير', quote_sent: 'تم إرسال العرض', waiting_payment: 'في انتظار الدفع', scheduled: 'مجدول', active: 'نشط', ended: 'منتهٍ', rejected: 'مرفوض', cancelled: 'ملغى', expired: 'منتهي الصلاحية' },
    quoteStatuses: { issued: 'متاح للقبول', accepted: 'مقبول', rejected: 'مرفوض', cancelled: 'ملغى', expired: 'منتهي الصلاحية' },
    paymentStatuses: { uploaded: 'تم الرفع', pending_review: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض' },
    open: 'عرض التفاصيل',
    backToList: 'العودة إلى الطلبات',
    requestDetails: 'تفاصيل طلب الإعلان',
    purpose: 'الغرض',
    interval: 'الفترة',
    history: 'سجل الحالة',
    quote: 'العرض الإداري',
    quoteTotal: 'الإجمالي',
    quoteValidUntil: 'صالح حتى',
    quoteTerms: 'الشروط',
    acceptQuote: 'قبول العرض',
    paymentProof: 'إثبات الدفع',
    paymentProofHelp: 'ارفع ملف PDF أو JPG أو PNG بحجم لا يتجاوز 10 ميجابايت. يتم فحص الملف ومراجعته يدويًا؛ لا يعني الرفع التحقق البنكي.',
    uploadPaymentProof: 'رفع إثبات الدفع',
    paymentProofUploaded: 'تم إرسال إثبات الدفع للمراجعة.',
    noPaymentProof: 'لم يتم إرسال إثبات دفع.',
    schedule: 'الجدولة',
    noSchedule: 'لا توجد جدولة متاحة بعد.',
    noQuote: 'لا يوجد عرض إداري بعد.',
    noHistory: 'لا يوجد سجل تغييرات.',
    createForm: { title: 'طلب إعلان جديد', description: 'أدخل بيانات الطلب المعتمدة. لا يتم تحديد السعر من هذا النموذج.', placementKey: 'مفتاح موضع الإعلان', placementKeyHelp: 'استخدم مفتاح موضع معتمد من إدارة المنصة.', purpose: 'الغرض من الإعلان', start: 'بداية الفترة', end: 'نهاية الفترة', cancel: 'إلغاء', save: 'إرسال الطلب', validation: 'راجع الحقول والتواريخ قبل الإرسال.', close: 'إغلاق نموذج الطلب' },
    commission: { eyebrow: 'العمولة', title: 'العمولة', description: 'سياسة العمولة المطبقة على حسابك كما يحددها النظام.', appliedPolicy: 'السياسة الحالية', source: 'المصدر', effectiveAt: 'سارية من', version: 'إصدار السياسة', kind: 'نوع العمولة', percentage: 'نسبة مئوية', fixed: 'مبلغ ثابت', noneTitle: 'لا توجد سياسة عمولة متاحة', noneBody: 'لم يتم تحديد سياسة عمولة لحسابك حاليًا. لا يتم افتراض نسبة عامة.', readOnly: 'هذه البيانات للعرض فقط ولا يمكن تغييرها من حساب المزود.', unavailable: 'غير متاح' },
    states: { loading: { title: 'جارٍ التحميل', body: 'يتم تحميل بيانات الإعلانات.' }, empty: { title: 'لا توجد طلبات إعلان', body: 'ستظهر طلبات الإعلان الخاصة بحسابك هنا عند توفرها.' }, error: { title: 'تعذر تحميل الإعلانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الإعلانات غير متاحة مؤقتًا', body: 'يمكنك إعادة المحاولة عند توفر الاتصال.' }, permission: { title: 'يلزم تسجيل الدخول', body: 'لا يتم عرض بيانات الإعلانات قبل التحقق من جلسة المزود.' }, notFound: { title: 'طلب الإعلان غير موجود', body: 'لا يمكن العثور على هذا الطلب ضمن بيانات حسابك.' }, success: { title: 'تم تحميل الإعلانات', body: 'تم تحميل بيانات الإعلانات بنجاح.' } },
    retry: 'إعادة المحاولة',
    notFound: 'طلب الإعلان غير موجود',
    unavailable: 'غير متاح',
    success: 'تم الحفظ بنجاح',
    mutationFailed: 'تعذر تنفيذ الإجراء. حاول مرة أخرى.'
  },
  en: {
    eyebrow: 'Advertising',
    title: 'Advertising requests',
    description: 'Track advertising requests, administrative quotes, and payment-proof review from your account.',
    create: 'New advertising request',
    refresh: 'Refresh',
    filtersLabel: 'Filter requests',
    statusLabel: 'Status',
    allStatuses: 'All statuses',
    apply: 'Apply',
    clear: 'Clear',
    count: 'advertising requests',
    columns: { request: 'Request', placement: 'Placement and purpose', period: 'Period', status: 'Status', quote: 'Administrative quote', payment: 'Payment proof', actions: 'Actions' },
    statuses: { draft: 'Draft', review: 'Under review', waiting_pricing: 'Waiting for pricing', quote_sent: 'Quote sent', waiting_payment: 'Waiting for payment', scheduled: 'Scheduled', active: 'Active', ended: 'Ended', rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired' },
    quoteStatuses: { issued: 'Ready to accept', accepted: 'Accepted', rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired' },
    paymentStatuses: { uploaded: 'Uploaded', pending_review: 'Under review', approved: 'Approved', rejected: 'Rejected' },
    open: 'View details',
    backToList: 'Back to requests',
    requestDetails: 'Advertising request details',
    purpose: 'Purpose',
    interval: 'Period',
    history: 'Status history',
    quote: 'Administrative quote',
    quoteTotal: 'Total',
    quoteValidUntil: 'Valid until',
    quoteTerms: 'Terms',
    acceptQuote: 'Accept quote',
    paymentProof: 'Payment proof',
    paymentProofHelp: 'Upload a PDF, JPG, or PNG up to 10 MB. The file is scanned and manually reviewed; upload does not mean bank verification.',
    uploadPaymentProof: 'Upload payment proof',
    paymentProofUploaded: 'Payment proof was submitted for review.',
    noPaymentProof: 'No payment proof submitted.',
    schedule: 'Schedule',
    noSchedule: 'No schedule is available yet.',
    noQuote: 'No administrative quote is available yet.',
    noHistory: 'No status history is available.',
    createForm: { title: 'New advertising request', description: 'Enter the approved request fields. Pricing is not set in this form.', placementKey: 'Advertising placement key', placementKeyHelp: 'Use a placement key approved by platform administration.', purpose: 'Advertising purpose', start: 'Period start', end: 'Period end', cancel: 'Cancel', save: 'Submit request', validation: 'Review the fields and dates before submitting.', close: 'Close request form' },
    commission: { eyebrow: 'Commission', title: 'Commission', description: 'The effective commission policy returned for your account.', appliedPolicy: 'Current policy', source: 'Source', effectiveAt: 'Effective from', version: 'Policy version', kind: 'Commission type', percentage: 'Percentage', fixed: 'Fixed amount', noneTitle: 'No commission policy available', noneBody: 'No commission policy is currently assigned to your account. No universal rate is assumed.', readOnly: 'This information is read-only and cannot be changed by the provider.', unavailable: 'Unavailable' },
    states: { loading: { title: 'Loading', body: 'Advertising data is loading.' }, empty: { title: 'No advertising requests', body: 'Advertising requests owned by your account will appear here when available.' }, error: { title: 'Advertising data could not load', body: 'Check the connection and try again.' }, retry: { title: 'Advertising is temporarily unavailable', body: 'You can retry when the connection is available.' }, permission: { title: 'Authentication required', body: 'Provider advertising data is not rendered before the session is verified.' }, notFound: { title: 'Advertising request not found', body: 'This request is not available in your account projection.' }, success: { title: 'Advertising data loaded', body: 'Advertising data loaded successfully.' } },
    retry: 'Retry',
    notFound: 'Advertising request not found',
    unavailable: 'Unavailable',
    success: 'Saved successfully',
    mutationFailed: 'The action could not be completed. Try again.'
  },};

export function getProviderAdvertisingCopy(locale: SupportedLocale): ProviderAdvertisingCopy {
  return copyByLocale[locale];
}
