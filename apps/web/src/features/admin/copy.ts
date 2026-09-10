import { localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminOverviewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
export type AdminNavKey = 'overview' | 'users' | 'providers' | 'properties' | 'requests' | 'content' | 'advertising' | 'commissions' | 'notifications' | 'audit' | 'settings';
export type AdminMetricKey = 'users' | 'seekers' | 'providers' | 'verifiedProviders' | 'publishedProperties' | 'openRequests' | 'pendingReviews';

export interface AdminCopy {
  readonly nav: Readonly<Record<AdminNavKey, string>>;
  readonly sidebar: {
    readonly groups: Readonly<Record<string, string>>;
    readonly items: Readonly<Record<string, string>>;
    readonly website: string;
    readonly brandAlt: string;
    readonly signOut: string;
    readonly signingOut: string;
    readonly avatar: string;
    readonly profileTitle: string;
    readonly profileSubtitle: string;
  };
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
    readonly placeholderSections: readonly Readonly<{ readonly title: string; readonly labels: readonly string[] }>[];
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
    sidebar: {
      groups: {
        home: 'الرئيسية',
        accounts: 'المستخدمون والحسابات',
        properties: 'إدارة العقارات',
        requests: 'الطلبات والعمليات',
        content: 'المحتوى والكوميونيتي',
        revenue: 'الإعلانات والمدفوعات',
        experience: 'تجربة المنصة',
        system: 'النظام'
      },
      items: {
        overview: 'نظرة عامة',
        users: 'جميع المستخدمين',
        seekers: 'الباحثون عن عقار',
        providers: 'مقدمو العقارات',
        verification: 'قائمة التوثيق',
        'account-reports': 'بلاغات الحسابات',
        'account-restrictions': 'قيود الحسابات',
        properties: 'العقارات',
        'property-review': 'مراجعة العقارات',
        'property-duplicates': 'عقارات مكررة محتملة',
        'property-reports': 'بلاغات العقارات',
        projects: 'المشروعات',
        'project-review': 'مراجعة المشروعات',
        categories: 'التصنيفات وأنواع العقارات',
        locations: 'المناطق والأحياء',
        features: 'المميزات والخدمات',
        requests: 'كل الطلبات',
        'customer-requests': 'طلبات العملاء',
        'overdue-requests': 'الطلبات المتأخرة',
        'contact-requests': 'طلبات التواصل',
        'viewing-requests': 'طلبات المعاينة',
        'search-requests': 'طلبات البحث عن عقار',
        'request-issues': 'بلاغات ومشكلات الطلبات',
        articles: 'المقالات',
        'article-categories': 'تصنيفات المقالات',
        community: 'الكوميونيتي',
        'community-comments': 'التعليقات',
        'community-reports': 'البلاغات',
        about: 'النبذة عن المنصة',
        team: 'فريق العمل',
        population: 'عدّاد سكان مدينة السادات',
        advertising: 'طلبات الإعلانات',
        'approved-proofs': 'إثباتات الدفع المعتمدة',
        'payment-review': 'مراجعة المدفوعات',
        'ad-calendar': 'تقويم الإعلانات',
        'payment-proofs': 'إثباتات الدفع',
        'financial-review': 'الملخص المالي',
        'commission-policies': 'سياسات العمولات',
        'commission-assignments': 'تعيين العمولات',
        'commission-exceptions': 'استثناءات العمولات',
        'commission-confirmations': 'تأكيد السياسات',
        banners: 'البانرات الإعلانية',
        tips: 'نصائح عقارات السادات',
        homepage: 'إدارة الصفحة الرئيسية',
        'contact-social': 'بيانات التواصل والسوشيال',
        seo: 'إعدادات SEO',
        'admin-users': 'المستخدمون الإداريون',
        roles: 'الأدوار والصلاحيات',
        notifications: 'إشعارات الإدارة',
        audit: 'سجل الإجراءات',
        settings: 'الإعدادات العامة'
      },
      website: 'عرض الموقع',
      brandAlt: 'عقارات السادات',
      signOut: 'تسجيل الخروج',
      signingOut: 'جارٍ تسجيل الخروج…',
      avatar: 'م',
      profileTitle: 'مدير النظام',
      profileSubtitle: 'حساب إداري'
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
      placeholderSections: [
        { title: 'المحتوى والمجتمع', labels: ['المقالات المنشورة', 'المنشورات المجتمعية', 'التعليقات', 'بلاغات المحتوى'] },
        { title: 'الإعلانات والإيرادات', labels: ['طلبات الإعلانات', 'إثباتات الدفع', 'الإعلانات النشطة', 'إجمالي الإيرادات'] }
      ],
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
    sidebar: {
      groups: {
        home: 'Home',
        accounts: 'Users and accounts',
        properties: 'Property management',
        requests: 'Requests and operations',
        content: 'Content and community',
        revenue: 'Advertising and payments',
        experience: 'Platform experience',
        system: 'System'
      },
      items: {
        overview: 'Overview',
        users: 'All users',
        seekers: 'Property seekers',
        providers: 'Property providers',
        verification: 'Verification queue',
        'account-reports': 'Account reports',
        'account-restrictions': 'Account restrictions',
        properties: 'Properties',
        'property-review': 'Property review',
        'property-duplicates': 'Possible duplicates',
        'property-reports': 'Property reports',
        projects: 'Projects',
        'project-review': 'Project review',
        categories: 'Property categories',
        locations: 'Locations and districts',
        features: 'Features and services',
        requests: 'All requests',
        'customer-requests': 'Customer requests',
        'overdue-requests': 'Overdue requests',
        'contact-requests': 'Contact requests',
        'viewing-requests': 'Viewing requests',
        'search-requests': 'Property search requests',
        'request-issues': 'Request issues',
        articles: 'Articles',
        'article-categories': 'Article categories',
        community: 'Community',
        'community-comments': 'Comments',
        'community-reports': 'Reports',
        about: 'About the platform',
        team: 'Team',
        population: 'Sadat population counter',
        advertising: 'Ad requests',
        'approved-proofs': 'Approved payment proofs',
        'payment-review': 'Payment review',
        'ad-calendar': 'Ad calendar',
        'payment-proofs': 'Payment proofs',
        'financial-review': 'Financial summary',
        'commission-policies': 'Commission policies',
        'commission-assignments': 'Commission assignments',
        'commission-exceptions': 'Commission exceptions',
        'commission-confirmations': 'Policy confirmations',
        banners: 'Banners',
        tips: 'Property tips',
        homepage: 'Homepage management',
        'contact-social': 'Contact and social',
        seo: 'SEO settings',
        'admin-users': 'Admin users',
        roles: 'Roles and permissions',
        notifications: 'Admin notifications',
        audit: 'Action log',
        settings: 'General settings'
      },
      website: 'View website',
      brandAlt: 'Sadat Real Estate',
      signOut: 'Sign out',
      signingOut: 'Signing out…',
      avatar: 'A',
      profileTitle: 'System administrator',
      profileSubtitle: 'Administrator account'
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
      placeholderSections: [
        { title: 'Content and community', labels: ['Published articles', 'Community posts', 'Comments', 'Content reports'] },
        { title: 'Advertising and revenue', labels: ['Ad requests', 'Payment proofs', 'Active ads', 'Total revenue'] }
      ],
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
  return localizeCopy('admin/copy#getAdminCopy', locale, copyByLocale[locale]);
}
