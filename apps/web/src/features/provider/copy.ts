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
    readonly unavailableMetric: string;
    readonly unavailableMetricBody: string;
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
      overview: 'نظرة عامة',
      properties: 'عقاراتي',
      projects: 'مشروعاتي',
      requests: 'طلبات العملاء',
      viewings: 'المعاينات',
      advertising: 'طلبات الإعلان',
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
      unavailableMetric: 'غير متاح',
      unavailableMetricBody: 'لا يقدم النظام الحالي هذا المؤشر في لوحة المزود.',
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
      overview: 'Overview',
      properties: 'My properties',
      projects: 'Projects',
      requests: 'Customer requests',
      viewings: 'Viewings',
      advertising: 'Advertising requests',
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
      unavailableMetric: 'Unavailable',
      unavailableMetricBody: 'This metric is not provided by the current provider contract.',
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
  },
  'zh-CN': {
    nav: {
      overview: '概览',
      properties: '我的房产',
      projects: '项目',
      requests: '客户需求',
      viewings: '看房预约',
      advertising: '广告申请',
      commission: '佣金',
      notifications: '通知',
      settings: '设置'
    },
    overview: {
      eyebrow: '房产提供方工作台',
      title: '概览',
      description: '使用提供方会话可用的真实数据查看账户和房产状态。',
      addProperty: '添加房产',
      summaryTitle: '房产摘要',
      cards: { total: '全部房产', published: '已发布', pending: '待审核', drafts: '草稿' },
      unavailableMetric: '不可用',
      unavailableMetricBody: '当前提供方契约未提供此指标。',
      recentTitle: '最近更新的房产',
      recentEmptyTitle: '暂无房产',
      recentEmptyBody: '账户符合条件后即可开始添加房产。',
      recentUnavailableTitle: '暂时无法显示房产',
      recentUnavailableBody: '连接可用后请重试。',
      openProperty: '打开房产'
    },
    properties: {
      eyebrow: '房产管理',
      title: '我的房产',
      description: '查看提供方账户拥有的房产、状态以及 API 返回的可用操作。',
      addProperty: '添加房产',
      filtersLabel: '筛选房产',
      searchLabel: '搜索',
      searchPlaceholder: '按名称或短链接搜索',
      statusLabel: '状态',
      allStatuses: '全部状态',
      applyFilters: '应用',
      clearFilters: '清除筛选',
      countSuffix: '套房产',
      emptyTitle: '暂无房产',
      emptyBody: '提供方账户拥有的房产将在可用时显示在这里。',
      noResultsTitle: '没有匹配的房产',
      noResultsBody: '请尝试更改搜索内容或状态筛选。',
      columns: { property: '房产', status: '状态', type: '类型', price: '价格', updated: '更新时间', actions: '操作' },
      kindLabels: { property: '房产', unit: '单元' },
      transactionLabels: { sale: '出售', rent: '出租' },
      view: '查看',
      edit: '编辑',
      submit: '提交审核',
      reason: '审核说明：',
      pagination: '房产分页',
      previous: '上一页',
      next: '下一页'
    },
    states: {
      loading: { title: '加载中', body: '正在准备提供方工作台。' },
      empty: { title: '暂无数据', body: '有可用的真实账户记录后，数据会显示在这里。' },
      error: { title: '无法加载提供方工作台', body: '请检查连接后重试。' },
      retry: { title: '提供方工作台暂不可用', body: '连接可用后可以再次尝试。' },
      success: { title: '提供方工作台已加载', body: '账户数据已成功加载。' },
      permission: { title: '需要身份验证', body: '会话验证前不会显示受保护的提供方数据。' }
    },
    application: {
      draft: { title: '完成提供方申请', body: '访问工作台前请完成所需信息。' },
      pending_review: { title: '申请正在审核', body: '申请审核完成后，完整的提供方工作台将可用。' },
      needs_information: { title: '需要更多申请信息', body: '查看所需信息并重新提交申请。' },
      approved: { title: '账户已通过', body: '你可以在提供方工作台管理已批准的记录。' },
      rejected: { title: '申请未获批准', body: '查看决定原因和账户可用的选项。' },
      suspended: { title: '账户暂时受限', body: '当前账户状态限制了提供方数据访问。' }
    },
    propertyStatuses: {
      draft: '草稿',
      pending_review: '待审核',
      needs_changes: '需要修改',
      approved: '已批准',
      published: '已发布',
      rejected: '已拒绝',
      hidden: '已隐藏',
      archived: '已归档'
    },
    retry: '重试',
    reviewReason: '原因：',
    continueApplication: '继续提供方申请',
    unavailable: '不可用'
  }
};

export function getProviderCopy(locale: SupportedLocale): ProviderCopy {
  return copyByLocale[locale];
}
