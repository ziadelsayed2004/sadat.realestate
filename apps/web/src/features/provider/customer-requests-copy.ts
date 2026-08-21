import type { RequestStatus, RequestTransition, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderCustomerRequestsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly add: string;
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
  },
  'zh-CN': {
    eyebrow: '客户请求管理',
    title: '客户请求',
    description: '使用系统返回的数据和操作跟进由提供方账户创建的客户请求。',
    add: '添加客户请求',
    countSuffix: '个请求',
    filtersLabel: '筛选客户请求',
    searchLabel: '搜索',
    searchPlaceholder: '按客户姓名或电话搜索',
    statusLabel: '状态',
    allStatuses: '全部状态',
    apply: '应用',
    clear: '清除',
    columns: { customer: '客户', request: '请求类型', status: '状态', related: '房产或项目', created: '创建时间', updated: '更新时间', actions: '操作' },
    statuses: { new: '新请求', under_review: '审核中', contacted: '已联系', scheduled: '已安排', needs_information: '需要信息', in_progress: '跟进中', resolved: '已解决', cancelled: '已取消', closed: '已关闭' },
    requestType: '客户请求',
    source: '来源',
    providerSource: '提供方账户',
    transitions: { start_review: '开始审核', contact: '标记为已联系', schedule: '安排时间', needs_information: '请求信息', start_progress: '开始跟进', resolve: '解决', cancel: '取消请求', close: '关闭请求', reopen: '重新打开' },
    noActions: '没有可用操作',
    emptyTitle: '暂无客户请求',
    emptyBody: '提供方账户创建的请求将在可用时显示在这里。',
    noResultsTitle: '没有匹配的请求',
    noResultsBody: '请尝试更改搜索或状态筛选。',
    unavailable: '不可用',
    previous: '上一页',
    next: '下一页',
    pagination: '客户请求分页',
    form: { title: '添加客户请求', description: '输入提供方账户允许使用的客户和请求数据。', customerDetails: '客户信息', firstName: '名字', lastName: '姓氏', phone: '电话号码', email: '电子邮箱', requestDetails: '请求详情', message: '请求详情或消息', propertyId: '房产 ID', projectId: '项目 ID', sourceNote: '来源备注', optional: '可选', cancel: '取消', save: '保存请求', close: '关闭', validation: '保存请求前请检查必填字段。' },
    transition: { title: '更新请求状态', description: '使用当前显示的请求版本确认操作。', reason: '原因或备注', reasonHelp: '取消、请求信息或关闭时必须填写原因。', cancel: '取消', confirm: '确认操作', validation: '请输入此操作的有效原因。' },
    feedback: { created: '客户请求已创建。', transitioned: '请求状态已更新。' },
    errors: { generic: '无法完成操作，请重试。', conflict: '请求在保存前已发生变化，请重新加载列表。', validation: '输入的数据无效。' }
  }
};

export function getProviderCustomerRequestsCopy(locale: SupportedLocale): ProviderCustomerRequestsCopy {
  return copyByLocale[locale];
}
