import type { PropertyKind, PropertyStatus, PropertyTransactionType, ProviderApplicationState, SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderOverviewBaseState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
export type ProviderNavKey = 'overview' | 'properties' | 'projects' | 'requests' | 'viewings' | 'advertising' | 'commission' | 'notifications' | 'settings';

export interface ProviderCopy {
  readonly nav: Readonly<Record<ProviderNavKey, string>>;
  readonly overview: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly addProperty: string;
    readonly summaryTitle: string;
    readonly cards: Readonly<Record<'total' | 'published' | 'pending' | 'drafts', string>>;
    readonly additionalCards?: Readonly<Record<'needsChanges' | 'customerRequests' | 'views' | 'booked', string>>;
    readonly unavailableMetric: string;
    readonly unavailableMetricBody: string;
    readonly chart?: { readonly title: string; readonly unavailable: string };
    readonly quickActions?: { readonly title: string; readonly properties: string; readonly addProperty: string; readonly requests: string; readonly settings: string };
    readonly recentColumns?: Readonly<Record<'code' | 'property' | 'status' | 'views' | 'updated', string>>;
    readonly recentTitle: string;
    readonly recentEmptyTitle: string;
    readonly recentEmptyBody: string;
    readonly recentUnavailableTitle: string;
    readonly recentUnavailableBody: string;
    readonly openProperty: string;
  };
  readonly properties: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly addProperty: string;
    readonly filtersLabel: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly statusLabel: string;
    readonly allStatuses: string;
    readonly applyFilters: string;
    readonly clearFilters: string;
    readonly countSuffix: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly noResultsTitle: string;
    readonly noResultsBody: string;
    readonly columns: Readonly<Record<'property' | 'status' | 'type' | 'price' | 'updated' | 'actions', string>>;
    readonly kindLabels: Readonly<Record<PropertyKind, string>>;
    readonly transactionLabels: Readonly<Record<PropertyTransactionType, string>>;
    readonly view: string;
    readonly edit: string;
    readonly submit: string;
    readonly reason: string;
    readonly pagination: string;
    readonly previous: string;
    readonly next: string;
  };
  readonly states: Readonly<Record<ProviderOverviewBaseState, { readonly title: string; readonly body: string }>>;
  readonly application: Readonly<Record<ProviderApplicationState, { readonly title: string; readonly body: string }>>;
  readonly propertyStatuses: Readonly<Record<PropertyStatus, string>>;
  readonly retry: string;
  readonly reviewReason: string;
  readonly continueApplication: string;
  readonly unavailable: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderCopy>> = {
  ar: {
    nav: {
      overview: 'لوحة التحكم',
      properties: 'عقاراتي',
      projects: 'المشاريع',
      requests: 'طلبات العملاء',
      viewings: 'المعاينات',
      advertising: 'الإعلانات',
      commission: 'العمولة',
      notifications: 'الإشعارات',
      settings: 'الإعدادات'
    },
    overview: {
      eyebrow: 'لوحة مزود العقار',
      title: 'نظرة عامة',
      description: 'تابع حالة حسابك وعقاراتك من خلال بيانات الحساب الفعلية.',
      addProperty: 'إضافة عقار',
      summaryTitle: 'ملخص العقارات',
      cards: { total: 'كل العقارات', published: 'منشورة', pending: 'قيد المراجعة', drafts: 'مسودات' },
      additionalCards: { needsChanges: 'تحتاج تعديل', customerRequests: 'طلبات العملاء', views: 'المشاهدات', booked: 'المحجوزة' },
      unavailableMetric: 'غير متاح',
      unavailableMetricBody: 'لا يقدم النظام الحالي هذا المؤشر في لوحة المزود.',
      chart: { title: 'المشاهدات والطلبات — آخر 6 أشهر', unavailable: 'لا توجد بيانات تاريخية في عقد المزود الحالي.' },
      quickActions: { title: 'إجراءات سريعة', properties: 'عقاراتي', addProperty: 'إضافة عقار', requests: 'طلبات العملاء', settings: 'الإعدادات' },
      recentColumns: { code: 'كود العقار', property: 'العنوان', status: 'الحالة', views: 'المشاهدات', updated: 'تاريخ الإضافة' },
      recentTitle: 'آخر العقارات تحديثاً',
      recentEmptyTitle: 'لا توجد عقارات بعد',
      recentEmptyBody: 'يمكنك بدء إضافة عقار عندما تكون حالة حساب المزود مؤهلة.',
      recentUnavailableTitle: 'لا يمكن عرض العقارات الآن',
      recentUnavailableBody: 'حاول مرة أخرى عند توفر اتصال صالح.',
      openProperty: 'فتح العقار'
    },
    properties: {
      eyebrow: 'إدارة العقارات',
      title: 'عقاراتي',
      description: 'راجع عقاراتك وحالاتها وإجراءاتها المتاحة من خلال سجلات المزود المملوكة لك.',
      addProperty: 'إضافة عقار',
      filtersLabel: 'تصفية العقارات',
      searchLabel: 'بحث',
      searchPlaceholder: 'ابحث بالاسم أو الرابط المختصر',
      statusLabel: 'الحالة',
      allStatuses: 'كل الحالات',
      applyFilters: 'تطبيق',
      clearFilters: 'مسح الفلاتر',
      countSuffix: 'عقار',
      emptyTitle: 'لا توجد عقارات بعد',
      emptyBody: 'ستظهر العقارات التي يملكها حسابك هنا عند توفرها.',
      noResultsTitle: 'لا توجد نتائج مطابقة',
      noResultsBody: 'جرّب تغيير البحث أو الحالة لعرض عقاراتك.',
      columns: { property: 'العقار', status: 'الحالة', type: 'النوع', price: 'السعر', updated: 'آخر تحديث', actions: 'الإجراءات' },
      kindLabels: { property: 'عقار', unit: 'وحدة' },
      transactionLabels: { sale: 'بيع', rent: 'إيجار' },
      view: 'عرض',
      edit: 'تعديل',
      submit: 'إرسال للمراجعة',
      reason: 'ملاحظة المراجعة:',
      pagination: 'صفحات العقارات',
      previous: 'الصفحة السابقة',
      next: 'الصفحة التالية'
    },
    states: {
      loading: { title: 'جارٍ التحميل', body: 'يتم تجهيز لوحة المزود.' },
      empty: { title: 'لا توجد بيانات بعد', body: 'ستظهر البيانات عندما تتوفر سجلات الحساب الفعلية.' },
      error: { title: 'تعذر تحميل لوحة المزود', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      retry: { title: 'تعذر الوصول إلى لوحة المزود', body: 'يمكنك إعادة المحاولة عند توفر الاتصال.' },
      success: { title: 'تم تحميل لوحة المزود', body: 'تم تحميل بيانات الحساب بنجاح.' },
      permission: { title: 'يلزم تسجيل الدخول', body: 'لا يتم عرض بيانات المزود المحمية قبل التحقق من الجلسة.' }
    },
    application: {
      draft: { title: 'أكمل طلب المزود', body: 'أكمل البيانات المطلوبة قبل الوصول إلى لوحة المزود.' },
      pending_review: { title: 'طلبك قيد المراجعة', body: 'ستظهر لوحة المزود الكاملة بعد انتهاء مراجعة الطلب.' },
      needs_information: { title: 'يلزم استكمال معلومات الطلب', body: 'راجع المعلومات المطلوبة ثم أعد إرسال الطلب.' },
      approved: { title: 'الحساب معتمد', body: 'يمكنك إدارة سجلاتك المعتمدة من لوحة المزود.' },
      rejected: { title: 'لم تتم الموافقة على الطلب', body: 'يمكنك مراجعة سبب القرار والخيارات المتاحة لحسابك.' },
      suspended: { title: 'الحساب موقوف مؤقتاً', body: 'الوصول إلى بيانات المزود مقيد حالياً وفقاً لحالة الحساب.' }
    },
    propertyStatuses: {
      draft: 'مسودة',
      pending_review: 'قيد المراجعة',
      needs_changes: 'تحتاج إلى تعديلات',
      approved: 'معتمدة',
      published: 'منشورة',
      rejected: 'مرفوضة',
      hidden: 'مخفية',
      archived: 'مؤرشفة'
    },
    retry: 'إعادة المحاولة',
    reviewReason: 'السبب:',
    continueApplication: 'متابعة طلب المزود',
    unavailable: 'غير متاح'
  },
  en: {
    nav: {
      overview: 'Dashboard',
      properties: 'My properties',
      projects: 'Projects',
      requests: 'Customer requests',
      viewings: 'Viewings',
      advertising: 'Advertising',
      commission: 'Commission',
      notifications: 'Notifications',
      settings: 'Settings'
    },
    overview: {
      eyebrow: 'Provider dashboard',
      title: 'Overview',
      description: 'Track your account and properties using the data available to your provider session.',
      addProperty: 'Add property',
      summaryTitle: 'Property summary',
      cards: { total: 'All properties', published: 'Published', pending: 'Pending review', drafts: 'Drafts' },
      additionalCards: { needsChanges: 'Needs changes', customerRequests: 'Customer requests', views: 'Views', booked: 'Booked' },
      unavailableMetric: 'Unavailable',
      unavailableMetricBody: 'This metric is not provided by the current provider contract.',
      chart: { title: 'Views and requests — last 6 months', unavailable: 'Historical dashboard data is not provided by the current provider contract.' },
      quickActions: { title: 'Quick actions', properties: 'My properties', addProperty: 'Add property', requests: 'Customer requests', settings: 'Settings' },
      recentColumns: { code: 'Property code', property: 'Property', status: 'Status', views: 'Views', updated: 'Added' },
      recentTitle: 'Recently updated properties',
      recentEmptyTitle: 'No properties yet',
      recentEmptyBody: 'Start adding a property when your provider account is eligible.',
      recentUnavailableTitle: 'Properties are not available',
      recentUnavailableBody: 'Try again when a valid connection is available.',
      openProperty: 'Open property'
    },
    properties: {
      eyebrow: 'Property management',
      title: 'My properties',
      description: 'Review the properties owned by your provider account, their states, and the actions returned by the API.',
      addProperty: 'Add property',
      filtersLabel: 'Filter properties',
      searchLabel: 'Search',
      searchPlaceholder: 'Search by name or slug',
      statusLabel: 'Status',
      allStatuses: 'All statuses',
      applyFilters: 'Apply',
      clearFilters: 'Clear filters',
      countSuffix: 'properties',
      emptyTitle: 'No properties yet',
      emptyBody: 'Properties owned by your provider account will appear here when available.',
      noResultsTitle: 'No matching properties',
      noResultsBody: 'Try changing the search or status filter.',
      columns: { property: 'Property', status: 'Status', type: 'Type', price: 'Price', updated: 'Updated', actions: 'Actions' },
      kindLabels: { property: 'Property', unit: 'Unit' },
      transactionLabels: { sale: 'Sale', rent: 'Rent' },
      view: 'View',
      edit: 'Edit',
      submit: 'Submit for review',
      reason: 'Review note:',
      pagination: 'Property pages',
      previous: 'Previous page',
      next: 'Next page'
    },
    states: {
      loading: { title: 'Loading', body: 'Preparing the provider dashboard.' },
      empty: { title: 'No data yet', body: 'Account data will appear when implemented records are available.' },
      error: { title: 'The provider dashboard could not load', body: 'Check the connection and try again.' },
      retry: { title: 'The provider dashboard is unavailable', body: 'You can retry when the connection is available.' },
      success: { title: 'Provider dashboard loaded', body: 'The account data loaded successfully.' },
      permission: { title: 'Authentication required', body: 'Protected provider data is not rendered before the session is verified.' }
    },
    application: {
      draft: { title: 'Complete your provider application', body: 'Complete the required information before accessing the provider dashboard.' },
      pending_review: { title: 'Your application is under review', body: 'The full provider dashboard will be available after the application review.' },
      needs_information: { title: 'More application information is required', body: 'Review the requested information and submit the application again.' },
      approved: { title: 'Account approved', body: 'You can manage your approved records from the provider dashboard.' },
      rejected: { title: 'Application not approved', body: 'Review the decision reason and the options available to your account.' },
      suspended: { title: 'Account temporarily suspended', body: 'Provider data access is currently restricted by the account state.' }
    },
    propertyStatuses: {
      draft: 'Draft',
      pending_review: 'Pending review',
      needs_changes: 'Needs changes',
      approved: 'Approved',
      published: 'Published',
      rejected: 'Rejected',
      hidden: 'Hidden',
      archived: 'Archived'
    },
    retry: 'Retry',
    reviewReason: 'Reason:',
    continueApplication: 'Continue provider application',
    unavailable: 'Unavailable'
  },};

export function getProviderCopy(locale: SupportedLocale): ProviderCopy {
  return copyByLocale[locale];
}
