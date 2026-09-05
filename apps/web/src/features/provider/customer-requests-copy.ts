import type { RequestStatus, RequestTransition, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderCustomerRequestsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly add: string;
  readonly viewings: string;
  readonly countSuffix: string;
  readonly filtersLabel: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly columns: Readonly<Record<'customer' | 'request' | 'status' | 'related' | 'created' | 'updated' | 'actions', string>>;
  readonly statuses: Readonly<Record<RequestStatus, string>>;
  readonly requestType: string;
  readonly source: string;
  readonly providerSource: string;
  readonly transitions: Readonly<Record<RequestTransition, string>>;
  readonly noActions: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly noResultsTitle: string;
  readonly noResultsBody: string;
  readonly unavailable: string;
  readonly previous: string;
  readonly next: string;
  readonly pagination: string;
  readonly form: {
    readonly title: string;
    readonly description: string;
    readonly customerDetails: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
    readonly email: string;
    readonly requestDetails: string;
    readonly message: string;
    readonly propertyId: string;
    readonly projectId: string;
    readonly sourceNote: string;
    readonly optional: string;
    readonly cancel: string;
    readonly save: string;
    readonly close: string;
    readonly validation: string;
  };
  readonly transition: {
    readonly title: string;
    readonly description: string;
    readonly reason: string;
    readonly reasonHelp: string;
    readonly cancel: string;
    readonly confirm: string;
    readonly validation: string;
  };
  readonly feedback: {
    readonly created: string;
    readonly transitioned: string;
  };
  readonly errors: {
    readonly generic: string;
    readonly conflict: string;
    readonly validation: string;
  };
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderCustomerRequestsCopy>> = {
  ar: {
    eyebrow: 'إدارة طلبات العملاء',
    title: 'طلبات العملاء',
    description: 'تابع طلبات العملاء التي أنشأها حسابك باستخدام البيانات والإجراءات التي يعيدها النظام.',
    add: 'إضافة طلب يدوي',
    viewings: 'مواعيد المعاينات',
    countSuffix: 'طلب',
    filtersLabel: 'تصفية طلبات العملاء',
    searchLabel: 'بحث',
    searchPlaceholder: 'ابحث باسم العميل أو رقم الهاتف',
    statusLabel: 'الحالة',
    allStatuses: 'كل الحالات',
    apply: 'تطبيق',
    clear: 'مسح',
    columns: { customer: 'العميل', request: 'نوع الطلب', status: 'الحالة', related: 'العقار أو المشروع', created: 'تاريخ الإنشاء', updated: 'آخر تحديث', actions: 'الإجراءات' },
    statuses: { new: 'طلب جديد', under_review: 'قيد المراجعة', contacted: 'تم التواصل', scheduled: 'موعد محدد', needs_information: 'يحتاج معلومات', in_progress: 'قيد المتابعة', resolved: 'مكتمل', cancelled: 'ملغى', closed: 'مغلق' },
    requestType: 'طلب عميل',
    source: 'المصدر',
    providerSource: 'من حساب المزود',
    transitions: { start_review: 'بدء المراجعة', contact: 'تم التواصل', schedule: 'تحديد موعد', needs_information: 'طلب معلومات', start_progress: 'بدء المتابعة', resolve: 'إغلاق الطلب كمكتمل', cancel: 'إلغاء الطلب', close: 'إغلاق الطلب', reopen: 'إعادة فتح الطلب' },
    noActions: 'لا توجد إجراءات متاحة',
    emptyTitle: 'لا توجد طلبات عملاء بعد',
    emptyBody: 'ستظهر الطلبات التي ينشئها حسابك هنا عند توفرها.',
    noResultsTitle: 'لا توجد نتائج مطابقة',
    noResultsBody: 'جرّب تغيير البحث أو الحالة.',
    unavailable: 'غير متاح',
    previous: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    pagination: 'صفحات طلبات العملاء',
    form: { title: 'إضافة طلب عميل', description: 'أدخل بيانات العميل والطلب المسموح بها لحساب المزود.', customerDetails: 'بيانات العميل', firstName: 'الاسم الأول', lastName: 'اسم العائلة', phone: 'رقم الهاتف', email: 'البريد الإلكتروني', requestDetails: 'تفاصيل الطلب', message: 'تفاصيل أو رسالة الطلب', propertyId: 'معرّف العقار', projectId: 'معرّف المشروع', sourceNote: 'ملاحظة المصدر', optional: 'اختياري', cancel: 'إلغاء', save: 'حفظ الطلب', close: 'إغلاق', validation: 'تحقق من البيانات المطلوبة قبل حفظ الطلب.' },
    transition: { title: 'تحديث حالة الطلب', description: 'أكد الإجراء باستخدام الإصدار الحالي للطلب.', reason: 'السبب أو الملاحظة', reasonHelp: 'السبب مطلوب عند الإلغاء أو طلب معلومات أو الإغلاق.', cancel: 'إلغاء', confirm: 'تأكيد الإجراء', validation: 'أدخل سبباً صالحاً لهذا الإجراء.' },
    feedback: { created: 'تم إنشاء طلب العميل.', transitioned: 'تم تحديث حالة الطلب.' },
    errors: { generic: 'تعذر تنفيذ العملية. حاول مرة أخرى.', conflict: 'تغير الطلب قبل حفظه. أعد تحميل القائمة.', validation: 'البيانات المدخلة غير صالحة.' }
  },
  en: {
    eyebrow: 'Customer request management',
    title: 'Customer requests',
    description: 'Track customer requests created by your provider account using the data and actions returned by the system.',
    add: 'Add customer request',
    viewings: 'Viewing appointments',
    countSuffix: 'requests',
    filtersLabel: 'Filter customer requests',
    searchLabel: 'Search',
    searchPlaceholder: 'Search by customer name or phone',
    statusLabel: 'Status',
    allStatuses: 'All statuses',
    apply: 'Apply',
    clear: 'Clear',
    columns: { customer: 'Customer', request: 'Request type', status: 'Status', related: 'Property or project', created: 'Created', updated: 'Updated', actions: 'Actions' },
    statuses: { new: 'New request', under_review: 'Under review', contacted: 'Contacted', scheduled: 'Scheduled', needs_information: 'Needs information', in_progress: 'In progress', resolved: 'Resolved', cancelled: 'Cancelled', closed: 'Closed' },
    requestType: 'Customer request',
    source: 'Source',
    providerSource: 'Provider account',
    transitions: { start_review: 'Start review', contact: 'Mark contacted', schedule: 'Schedule', needs_information: 'Request information', start_progress: 'Start follow-up', resolve: 'Resolve', cancel: 'Cancel request', close: 'Close request', reopen: 'Reopen' },
    noActions: 'No actions available',
    emptyTitle: 'No customer requests yet',
    emptyBody: 'Requests created by your provider account will appear here when available.',
    noResultsTitle: 'No matching requests',
    noResultsBody: 'Try changing the search or status filter.',
    unavailable: 'Unavailable',
    previous: 'Previous page',
    next: 'Next page',
    pagination: 'Customer request pages',
    form: { title: 'Add customer request', description: 'Enter the customer and request data allowed for the provider account.', customerDetails: 'Customer details', firstName: 'First name', lastName: 'Last name', phone: 'Phone number', email: 'Email', requestDetails: 'Request details', message: 'Request details or message', propertyId: 'Property ID', projectId: 'Project ID', sourceNote: 'Source note', optional: 'Optional', cancel: 'Cancel', save: 'Save request', close: 'Close', validation: 'Check the required fields before saving the request.' },
    transition: { title: 'Update request status', description: 'Confirm the action using the request version currently shown.', reason: 'Reason or note', reasonHelp: 'A reason is required when cancelling, requesting information, or closing.', cancel: 'Cancel', confirm: 'Confirm action', validation: 'Enter a valid reason for this action.' },
    feedback: { created: 'Customer request created.', transitioned: 'Request status updated.' },
    errors: { generic: 'The operation could not be completed. Try again.', conflict: 'The request changed before it was saved. Reload the list.', validation: 'The entered data is not valid.' }
  },};

export function getProviderCustomerRequestsCopy(locale: SupportedLocale): ProviderCustomerRequestsCopy {
  return copyByLocale[locale];
}
