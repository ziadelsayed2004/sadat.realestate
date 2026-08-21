import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface SeekerCopy {
  readonly nav: Readonly<Record<'overview' | 'requests' | 'viewings' | 'saved' | 'notifications' | 'profile' | 'settings', string>>;
  readonly overview: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchProperties: string;
    readonly summaryTitle: string;
    readonly cards: Readonly<Record<'requests' | 'viewings' | 'savedProperties' | 'notifications', string>>;
    readonly activityTitle: string;
    readonly activityBody: string;
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
        requests: 'إجمالي الطلبات',
        viewings: 'المعاينات القادمة',
        savedProperties: 'العقارات المحفوظة',
        notifications: 'الإشعارات غير المقروءة'
      },
      activityTitle: 'آخر النشاط',
      activityBody: 'ستظهر تفاصيل الطلبات والمعاينات والإشعارات هنا عند توفرها من العقود الخاصة بها.',
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
        viewings: 'Upcoming viewings',
        savedProperties: 'Saved properties',
        notifications: 'Unread notifications'
      },
      activityTitle: 'Recent activity',
      activityBody: 'Request, viewing, and notification details appear here when their own contracts are available.',
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
  },
  'zh-CN': {
    nav: {
      overview: '概览',
      requests: '我的请求',
      viewings: '看房请求',
      saved: '已保存房源',
      notifications: '通知',
      profile: '个人资料与偏好',
      settings: '账户设置'
    },
    overview: {
      eyebrow: '购房者工作区',
      title: '欢迎使用萨达特房地产',
      description: '这里显示你在萨达特房地产平台上的当前活动摘要。',
      searchProperties: '查找新房源',
      summaryTitle: '活动摘要',
      cards: {
        requests: '请求总数',
        viewings: '即将进行的看房',
        savedProperties: '已保存房源',
        notifications: '未读通知'
      },
      activityTitle: '最近活动',
      activityBody: '当对应的请求、看房和通知契约可用时，详细信息会显示在这里。',
      unavailableTitle: '活动详情暂不可用',
      unavailableBody: '此部分只显示摘要契约提供的数据，不会编造数字或内容。',
      emptyTitle: '暂无活动',
      emptyBody: '先查找房源，或保存房源以便稍后查看。'
    },
    states: {
      loading: { title: '正在加载购房者面板', body: '正在获取你的活动摘要。' },
      retry: { title: '无法加载购房者面板', body: '请检查连接后重试。' },
      error: { title: '购房者面板不可用', body: '无法读取数据，请稍后重试。' },
      permission: { title: '需要登录', body: '只有已验证的购房者账户才能查看这些数据。' }
    },
    retry: '重试',
    active: '当前',
    localeLabel: '语言'
  }
};

export function getSeekerCopy(locale: SupportedLocale): SeekerCopy {
  return copy[locale];
}

