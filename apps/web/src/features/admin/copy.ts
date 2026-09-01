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
  },};

export function getAdminCopy(locale: SupportedLocale): AdminCopy {
  return copyByLocale[locale];
}
