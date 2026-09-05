import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface SeekerCopy {
  readonly nav: Readonly<Record<'overview' | 'requests' | 'viewings' | 'saved' | 'notifications' | 'profile' | 'settings', string>>;
  readonly overview: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchProperties: string;
    readonly summaryTitle: string;
    readonly cards: Readonly<Record<'requests' | 'activeRequests' | 'viewings' | 'savedProperties' | 'notifications', string>>;
    readonly activityTitle: string;
    readonly activityBody: string;
    readonly recent: Readonly<{
      requests: string;
      viewings: string;
      notifications: string;
      viewAll: string;
      empty: string;
      requestId: string;
      property: string;
      status: string;
      appointment: string;
    }>;
    readonly unavailableTitle: string;
    readonly unavailableBody: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
  };
  readonly states: Readonly<Record<'loading' | 'retry' | 'error' | 'permission', { readonly title: string; readonly body: string }>>;
  readonly retry: string;
  readonly active: string;
  readonly localeLabel: string;
}

const copy: Readonly<Record<SupportedLocale, SeekerCopy>> = {
  ar: {
    nav: {
      overview: 'نظرة عامة',
      requests: 'طلباتي',
      viewings: 'طلبات المعاينة',
      saved: 'العقارات المحفوظة',
      notifications: 'الإشعارات',
      profile: 'الملف الشخصي والتفضيلات',
      settings: 'إعدادات الحساب'
    },
    overview: {
      eyebrow: 'مساحة الباحث عن عقار',
      title: 'أهلاً بك في عقارات السادات',
      description: 'هذه نظرة عامة على نشاطك الحالي في منصة عقارات السادات.',
      searchProperties: 'ابحث عن عقار جديد',
      summaryTitle: 'ملخص النشاط',
      cards: {
        activeRequests: '\u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629',
        requests: 'إجمالي الطلبات',
        viewings: 'المعاينات القادمة',
        savedProperties: 'العقارات المحفوظة',
        notifications: 'الإشعارات غير المقروءة'
      },
      activityTitle: 'آخر النشاط',
      activityBody: 'ستظهر تفاصيل الطلبات والمعاينات والإشعارات هنا عند توفرها من العقود الخاصة بها.',
      recent: {
        requests: 'طلباتي النشطة',
        viewings: 'معاينات قادمة',
        notifications: 'آخر الإشعارات',
        viewAll: 'عرض الكل',
        empty: 'لا توجد بيانات حديثة',
        requestId: 'رقم الطلب',
        property: 'العقار',
        status: 'الحالة',
        appointment: 'الموعد'
      },
      unavailableTitle: 'تفاصيل النشاط غير متاحة بعد',
      unavailableBody: 'يعرض هذا القسم البيانات التي يوفرها عقد الملخص فقط، ولا يضيف أرقاماً أو محتوى غير موجود.',
      emptyTitle: 'لا يوجد نشاط بعد',
      emptyBody: 'ابدأ بالبحث عن عقار أو احفظ عقاراً للعودة إليه لاحقاً.'
    },
    states: {
      loading: { title: 'جارٍ تحميل لوحة الباحث', body: 'يتم جلب ملخص نشاطك من المنصة.' },
      retry: { title: 'تعذر تحميل لوحة الباحث', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      error: { title: 'تعذر عرض لوحة الباحث', body: 'حدث خطأ أثناء قراءة البيانات. حاول مرة أخرى لاحقاً.' },
      permission: { title: 'يلزم تسجيل الدخول', body: 'هذه البيانات متاحة لحساب الباحث الموثق فقط.' }
    },
    retry: 'إعادة المحاولة',
    active: 'الحالي',
    localeLabel: 'اللغة'
  },
  en: {
    nav: {
      overview: 'Overview',
      requests: 'My requests',
      viewings: 'Viewing requests',
      saved: 'Saved properties',
      notifications: 'Notifications',
      profile: 'Profile and preferences',
      settings: 'Account settings'
    },
    overview: {
      eyebrow: 'Seeker workspace',
      title: 'Welcome to Sadat Real Estate',
      description: 'A current summary of your activity on Sadat Real Estate.',
      searchProperties: 'Find a new property',
      summaryTitle: 'Activity summary',
      cards: {
        requests: 'Total requests',
        activeRequests: 'Active requests',
        viewings: 'Upcoming viewings',
        savedProperties: 'Saved properties',
        notifications: 'Unread notifications'
      },
      activityTitle: 'Recent activity',
      activityBody: 'Request, viewing, and notification details appear here when their own contracts are available.',
      recent: {
        requests: 'Active requests',
        viewings: 'Upcoming viewings',
        notifications: 'Recent notifications',
        viewAll: 'View all',
        empty: 'No recent activity',
        requestId: 'Request',
        property: 'Property',
        status: 'Status',
        appointment: 'Appointment'
      },
      unavailableTitle: 'Activity details are unavailable',
      unavailableBody: 'This section renders only the summary contract and never invents counts or content.',
      emptyTitle: 'No activity yet',
      emptyBody: 'Start by finding a property or save one to return to later.'
    },
    states: {
      loading: { title: 'Loading seeker dashboard', body: 'Your activity summary is being retrieved.' },
      retry: { title: 'The seeker dashboard could not load', body: 'Check the connection and try again.' },
      error: { title: 'The seeker dashboard is unavailable', body: 'The data could not be read. Try again later.' },
      permission: { title: 'Sign-in required', body: 'This data is available only to a verified seeker account.' }
    },
    retry: 'Retry',
    active: 'Current',
    localeLabel: 'Locale'
  },};

export function getSeekerCopy(locale: SupportedLocale): SeekerCopy {
  return copy[locale];
}
