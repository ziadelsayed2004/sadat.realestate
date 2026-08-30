import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminOverviewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
export type AdminNavKey = 'overview' | 'users' | 'providers' | 'properties' | 'requests' | 'content' | 'advertising' | 'commissions' | 'notifications' | 'audit' | 'settings';
export type AdminMetricKey = 'users' | 'seekers' | 'providers' | 'verifiedProviders' | 'publishedProperties' | 'openRequests' | 'pendingReviews';

export interface AdminCopy {
  readonly nav: Readonly<Record<AdminNavKey, string>>;
  readonly overview: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly rangeLabel: string;
    readonly refreshedLabel: string;
    readonly platformTitle: string;
    readonly operationsTitle: string;
    readonly queueTitle: string;
    readonly queueBody: string;
    readonly activityTitle: string;
    readonly actions: Readonly<{ readonly reviewAccounts: string; readonly reviewProperties: string; readonly createArticle: string; readonly reviewAdvertising: string }>;
    readonly metrics: Readonly<Record<AdminMetricKey, string>>;
    readonly emptyTitle: string;
    readonly emptyBody: string;
  };
  readonly states: Readonly<Record<AdminOverviewState, { readonly title: string; readonly body: string }>>;
  readonly retry: string;
  readonly unavailable: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminCopy>> = {
  ar: {
    nav: {
      overview: 'نظرة عامة',
      users: 'المستخدمون والحسابات',
      providers: 'مقدمو العقارات',
      properties: 'العقارات',
      requests: 'الطلبات',
      content: 'المحتوى والمجتمع',
      advertising: 'الإعلانات والإيرادات',
      commissions: 'العمولات',
      notifications: 'الإشعارات',
      audit: 'سجل التدقيق',
      settings: 'الإعدادات'
    },
    overview: {
      eyebrow: 'مدير النظام',
      title: 'نظرة عامة',
      description: 'تابع نشاط المنصة والطلبات التي تحتاج إلى مراجعة من مكان واحد.',
      rangeLabel: 'الفترة المعروضة',
      refreshedLabel: 'آخر تحديث',
      platformTitle: 'المنصة',
      operationsTitle: 'التشغيل والمراجعة',
      queueTitle: 'طلبات تحتاج إلى مراجعة',
      queueBody: 'تفاصيل الطلبات غير متاحة من عقد لوحة المؤشرات الحالي.',
      activityTitle: 'آخر الإجراءات',
      actions: { reviewAccounts: 'مراجعة الحسابات', reviewProperties: 'مراجعة العقارات', createArticle: 'إنشاء مقال', reviewAdvertising: 'مراجعة الإعلانات' },
      metrics: {
        users: 'إجمالي المستخدمين',
        seekers: 'الباحثون عن عقار',
        providers: 'مقدمو العقارات',
        verifiedProviders: 'مقدمو العقارات الموثقون',
        publishedProperties: 'العقارات المنشورة',
        openRequests: 'الطلبات المفتوحة',
        pendingReviews: 'المراجعات المعلقة'
      },
      emptyTitle: 'لا توجد بيانات في هذه الفترة',
      emptyBody: 'لم تُسجل مؤشرات تشغيلية ضمن الفترة المحددة. ستظهر البيانات هنا عند توفر سجلات فعلية.'
    },
    states: {
      loading: { title: 'جارٍ تحميل لوحة الإدارة', body: 'يتم جلب المؤشرات من مصدر المنصة الفعلي.' },
      empty: { title: 'لا توجد بيانات في هذه الفترة', body: 'لا توجد سجلات تشغيلية فعلية لعرضها.' },
      error: { title: 'تعذر تحميل لوحة الإدارة', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      retry: { title: 'تعذر الوصول إلى لوحة الإدارة', body: 'يمكنك إعادة المحاولة عند توفر الاتصال.' },
      success: { title: 'تم تحميل لوحة الإدارة', body: 'تم تحميل المؤشرات من المصدر الفعلي.' },
      permission: { title: 'لا تملك صلاحية الوصول', body: 'تتطلب هذه الصفحة جلسة مدير نظام مصادقاً عليها.' }
    },
    retry: 'إعادة المحاولة',
    unavailable: 'غير متاح'
  },
  en: {
    nav: {
      overview: 'Overview',
      users: 'Users and accounts',
      providers: 'Property providers',
      properties: 'Properties',
      requests: 'Requests',
      content: 'Content and community',
      advertising: 'Advertising and revenue',
      commissions: 'Commissions',
      notifications: 'Notifications',
      audit: 'Audit log',
      settings: 'Settings'
    },
    overview: {
      eyebrow: 'System administrator',
      title: 'Overview',
      description: 'Monitor platform activity and the requests that need attention in one place.',
      rangeLabel: 'Displayed range',
      refreshedLabel: 'Last refreshed',
      platformTitle: 'Platform',
      operationsTitle: 'Operations and review',
      queueTitle: 'Requests needing review',
      queueBody: 'Request details are not available from the current overview contract.',
      activityTitle: 'Recent activity',
      actions: { reviewAccounts: 'Review accounts', reviewProperties: 'Review properties', createArticle: 'Create article', reviewAdvertising: 'Review advertising' },
      metrics: {
        users: 'Total users',
        seekers: 'Property seekers',
        providers: 'Property providers',
        verifiedProviders: 'Verified providers',
        publishedProperties: 'Published properties',
        openRequests: 'Open requests',
        pendingReviews: 'Pending reviews'
      },
      emptyTitle: 'No data in this range',
      emptyBody: 'There are no operational records for the selected range. Real metrics will appear when records are available.'
    },
    states: {
      loading: { title: 'Loading the admin dashboard', body: 'Fetching metrics from the live platform source.' },
      empty: { title: 'No data in this range', body: 'There are no real operational records to display.' },
      error: { title: 'The admin dashboard could not load', body: 'Check the connection and try again.' },
      retry: { title: 'The admin dashboard is unavailable', body: 'Retry when the connection is available.' },
      success: { title: 'Admin dashboard loaded', body: 'Metrics were loaded from the implemented source.' },
      permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session.' }
    },
    retry: 'Retry',
    unavailable: 'Unavailable'
  },
  'zh-CN': {
    nav: {
      overview: '概览',
      users: '用户与账户',
      providers: '房产提供方',
      properties: '房产',
      requests: '请求',
      content: '内容与社区',
      advertising: '广告与收入',
      commissions: '佣金',
      notifications: '通知',
      audit: '审计日志',
      settings: '设置'
    },
    overview: {
      eyebrow: '系统管理员',
      title: '概览',
      description: '在一个页面中查看平台活动以及需要处理的请求。',
      rangeLabel: '显示范围',
      refreshedLabel: '最后更新',
      platformTitle: '平台',
      operationsTitle: '运营与审核',
      queueTitle: '需要审核的请求',
      queueBody: '当前概览契约不提供请求详情。',
      activityTitle: '最近活动',
      actions: { reviewAccounts: '审核账户', reviewProperties: '审核房产', createArticle: '创建文章', reviewAdvertising: '审核广告' },
      metrics: {
        users: '用户总数',
        seekers: '找房者',
        providers: '房产提供方',
        verifiedProviders: '已验证提供方',
        publishedProperties: '已发布房产',
        openRequests: '开放请求',
        pendingReviews: '待审核项目'
      },
      emptyTitle: '此范围内暂无数据',
      emptyBody: '所选范围内没有运营记录。有真实记录后，数据会显示在这里。'
    },
    states: {
      loading: { title: '正在加载管理面板', body: '正在从平台实际数据源获取指标。' },
      empty: { title: '此范围内暂无数据', body: '没有可显示的真实运营记录。' },
      error: { title: '无法加载管理面板', body: '请检查连接后重试。' },
      retry: { title: '暂时无法访问管理面板', body: '连接恢复后可以重试。' },
      success: { title: '管理面板已加载', body: '指标已从已实现的数据源加载。' },
      permission: { title: '无权访问', body: '此页面需要已认证的管理员会话。' }
    },
    retry: '重试',
    unavailable: '不可用'
  }
};

export function getAdminCopy(locale: SupportedLocale): AdminCopy {
  return copyByLocale[locale];
}
